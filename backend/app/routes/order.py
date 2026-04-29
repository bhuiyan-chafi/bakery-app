import random
import string
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import db

order_bp = Blueprint('order', __name__)


def _generate_order_number():
    """Generate a short unique order number like ORD-A3F9."""
    from app.models.order import Order
    while True:
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        number = f"ORD-{suffix}"
        if not Order.query.filter_by(order_number=number).first():
            return number


def _serialize_order(order, include_items=False):
    from app.models.product import Product
    data = {
        "uuid": order.uuid,
        "order_number": order.order_number,
        "customer_name": order.customer_name,
        "phone": order.phone,
        "address": order.address,
        "order_type": order.order_type.value,
        "status": order.status.value,
        "discount_type": order.discount_type.value,
        "discount_value": order.discount_value,
        "discount_amount": order.discount_amount,
        "subtotal": order.subtotal,
        "total": order.total,
        "notes": order.notes,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }
    if include_items:
        items = []
        for item in order.items:
            product = Product.query.get(item.product_uuid)
            items.append({
                "uuid": item.uuid,
                "product_uuid": item.product_uuid,
                "product_name": product.name if product else "Unknown",
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
            })
        data["items"] = items
    return data


# ── GET /orders/ ────────────────────────────────────────────────────────────
@order_bp.route('/', methods=['GET'])
def get_orders():
    from app.models.order import Order
    limit = min(int(request.args.get('limit', 100)), 500)
    orders = Order.query.order_by(Order.created_at.desc()).limit(limit).all()
    return jsonify([_serialize_order(o) for o in orders]), 200


# ── GET /orders/<uuid> ───────────────────────────────────────────────────────
@order_bp.route('/<order_uuid>', methods=['GET'])
def get_order(order_uuid):
    from app.models.order import Order
    order = Order.query.get_or_404(order_uuid)
    return jsonify(_serialize_order(order, include_items=True)), 200


# ── POST /orders/ ────────────────────────────────────────────────────────────
@order_bp.route('/', methods=['POST'])
def create_order():
    from app.models.order import Order, OrderItem, OrderType, OrderStatus, DiscountType
    from app.models.product import Product

    data = request.get_json()

    # Validate required fields
    customer_name = data.get('customer_name', '').strip()
    if not customer_name:
        return jsonify({"error": "customer_name is required"}), 400

    items_data = data.get('items', [])
    if not items_data:
        return jsonify({"error": "At least one item is required"}), 400

    # Validate order type
    raw_type = data.get('order_type', 'shop')
    try:
        order_type = OrderType(raw_type)
    except ValueError:
        return jsonify({"error": f"Invalid order_type. Must be one of: {[e.value for e in OrderType]}"}), 400

    # Derive status from order type (frontend rule, enforced here too)
    status = OrderStatus.COMPLETE if order_type == OrderType.SHOP else OrderStatus.PENDING

    # Validate discount type
    raw_discount_type = data.get('discount_type', 'amount')
    try:
        discount_type = DiscountType(raw_discount_type)
    except ValueError:
        return jsonify({"error": f"Invalid discount_type. Must be one of: {[e.value for e in DiscountType]}"}), 400

    # Build and validate items
    order_items = []
    for idx, item in enumerate(items_data):
        product_uuid = item.get('product_uuid')
        quantity = item.get('quantity')
        unit_price = item.get('unit_price')

        if not product_uuid:
            return jsonify({"error": f"Item {idx+1}: product_uuid is required"}), 400
        if not Product.query.get(product_uuid):
            return jsonify({"error": f"Item {idx+1}: product not found"}), 404
        if not quantity or float(quantity) <= 0:
            return jsonify({"error": f"Item {idx+1}: quantity must be greater than 0"}), 400

        qty = float(quantity)
        price = float(unit_price) if unit_price is not None else 0.0
        order_items.append(OrderItem(
            product_uuid=product_uuid,
            quantity=qty,
            unit_price=price,
            line_total=round(qty * price, 4),
        ))

    subtotal = round(sum(i.line_total for i in order_items), 4)
    discount_value = float(data.get('discount_value', 0))
    discount_amount = round(float(data.get('discount_amount', 0)), 4)
    total = round(max(subtotal - discount_amount, 0), 4)

    order = Order(
        order_number=_generate_order_number(),
        customer_name=customer_name,
        phone=data.get('phone'),
        address=data.get('address'),
        order_type=order_type,
        status=status,
        discount_type=discount_type,
        discount_value=discount_value,
        discount_amount=discount_amount,
        subtotal=subtotal,
        total=total,
        notes=data.get('notes'),
        items=order_items,
    )

    db.session.add(order)
    db.session.commit()
    return jsonify({"message": "Order created", "uuid": order.uuid, "order_number": order.order_number}), 201


# ── PUT /orders/<uuid> ────────────────────────────────────────────────────────
@order_bp.route('/<order_uuid>', methods=['PUT'])
def update_order(order_uuid):
    from app.models.order import Order, OrderStatus

    order = Order.query.get_or_404(order_uuid)

    if order.status == OrderStatus.COMPLETE:
        return jsonify({"error": "Completed orders cannot be modified"}), 403

    data = request.get_json()

    if 'customer_name' in data:
        order.customer_name = data['customer_name'].strip()
    if 'phone' in data:
        order.phone = data['phone']
    if 'address' in data:
        order.address = data['address']
    if 'notes' in data:
        order.notes = data['notes']
    if 'status' in data:
        try:
            order.status = OrderStatus(data['status'])
        except ValueError:
            return jsonify({"error": f"Invalid status. Must be one of: {[e.value for e in OrderStatus]}"}), 400

    order.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Order updated"}), 200


# ── DELETE /orders/<uuid> ─────────────────────────────────────────────────────
@order_bp.route('/<order_uuid>', methods=['DELETE'])
def delete_order(order_uuid):
    from app.models.order import Order, OrderStatus

    order = Order.query.get_or_404(order_uuid)

    if order.status == OrderStatus.COMPLETE:
        return jsonify({"error": "Completed orders cannot be deleted"}), 403

    db.session.delete(order)
    db.session.commit()
    return jsonify({"message": "Order deleted"}), 200
