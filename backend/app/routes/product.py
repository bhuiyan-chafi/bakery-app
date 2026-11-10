from flask import Blueprint, request, jsonify
from app.models.product import ProductCategory, CategoryStatus
from app.extensions import db
from app.utils.decorators import require_permission

product_bp = Blueprint('products', __name__)

# --- Product Categories ---

@product_bp.route('/categories', methods=['GET'])
@require_permission('product:view', 'product:manage')
def get_categories():
    categories = ProductCategory.query.limit(20).all()
    return jsonify([{
        "uuid": cat.uuid,
        "name": cat.name,
        "parent": cat.parent,
        "status": cat.status.value
    } for cat in categories]), 200

@product_bp.route('/categories', methods=['POST'])
@require_permission('product:manage')
def add_category():
    data = request.get_json()
    name = data.get('name')
    parent_val = data.get('parent', '0')
    status_val = data.get('status', 'active')

    if not name:
        return jsonify({"error": "Category name is required"}), 400

    resolved_parent = '0'
    if parent_val != '0':
        parent_category = ProductCategory.query.filter_by(name=parent_val).first()
        if not parent_category:
            parent_category = ProductCategory.query.get(parent_val)
        if parent_category:
            resolved_parent = parent_category.uuid
        else:
            return jsonify({"error": f"Parent category '{parent_val}' not found"}), 404

    category = ProductCategory(name=name, parent=resolved_parent, status=CategoryStatus(status_val))
    db.session.add(category)
    db.session.commit()
    return jsonify({"message": "Category added successfully", "uuid": category.uuid}), 201

@product_bp.route('/categories/<uuid>', methods=['PUT'])
@require_permission('product:manage')
def update_category(uuid):
    data = request.get_json()
    category = ProductCategory.query.get_or_404(uuid)

    if 'name' in data:
        category.name = data['name']

    if 'parent' in data:
        parent_val = data['parent']
        if parent_val == '0':
            category.parent = '0'
        elif parent_val == category.uuid or parent_val == category.name:
            return jsonify({"error": "A category cannot be its own parent"}), 400
        else:
            parent_category = ProductCategory.query.filter_by(name=parent_val).first()
            if not parent_category:
                parent_category = ProductCategory.query.get(parent_val)
            if parent_category:
                if parent_category.uuid == category.uuid:
                    return jsonify({"error": "A category cannot be its own parent"}), 400
                category.parent = parent_category.uuid
            else:
                return jsonify({"error": f"Parent category '{parent_val}' not found"}), 404

    if 'status' in data:
        category.status = CategoryStatus(data['status'])

    db.session.commit()
    return jsonify({"message": "Category updated successfully"}), 200

@product_bp.route('/categories/<uuid>', methods=['DELETE'])
@require_permission('product:manage')
def delete_category(uuid):
    category = ProductCategory.query.get_or_404(uuid)
    children = ProductCategory.query.filter_by(parent=uuid).first()
    if children:
        return jsonify({"error": "Cannot delete category with subcategories"}), 400
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200

@product_bp.route('/categories/search/<query>', methods=['GET'])
@require_permission('product:view', 'product:manage')
def search_categories(query):
    categories = ProductCategory.query.filter(ProductCategory.name.ilike(f"%{query}%")).limit(50).all()
    return jsonify([{
        "uuid": cat.uuid,
        "name": cat.name,
        "parent": cat.parent,
        "status": cat.status.value
    } for cat in categories]), 200


# --- Products ---

@product_bp.route('/', methods=['GET'])
@require_permission('product:view', 'product:manage', 'order:view', 'order:manage', 'sale:view')
def get_products():
    from datetime import datetime
    from app.models.product import Product, ProductTransaction, ProductTransactionType
    from app.models.order import Order
    from sqlalchemy import func, or_

    start_date_str = request.args.get('start_date', '').strip()
    end_date_str = request.args.get('end_date', '').strip()
    salesman = request.args.get('salesman', '').strip()

    # If only one date is provided, treat it as a single-day snapshot
    if start_date_str and not end_date_str:
        end_date_str = start_date_str
    elif end_date_str and not start_date_str:
        start_date_str = end_date_str

    period_start = None
    period_end = None

    if start_date_str and end_date_str:
        try:
            s_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
            e_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
            period_start = datetime(s_dt.year, s_dt.month, s_dt.day, 0, 0, 0)
            period_end = datetime(e_dt.year, e_dt.month, e_dt.day, 23, 59, 59, 999999)
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    products = Product.query.order_by(Product.name).limit(50).all()
    result = []
    for p in products:
        category = ProductCategory.query.get(p.category_uuid)

        if period_start and period_end:
            # 1. Opening stock before period_start
            in_before = db.session.query(func.sum(ProductTransaction.quantity)).filter(
                ProductTransaction.product_uuid == p.uuid,
                ProductTransaction.transaction_type == "IN",
                ProductTransaction.created_at < period_start
            ).scalar() or 0.0

            out_before = db.session.query(func.sum(ProductTransaction.quantity)).filter(
                ProductTransaction.product_uuid == p.uuid,
                ProductTransaction.transaction_type == "OUT",
                ProductTransaction.created_at < period_start
            ).scalar() or 0.0

            opening_stock = max(round(in_before - out_before, 4), 0.0)

            # 2. Produced during period
            produced_in_period = db.session.query(func.sum(ProductTransaction.quantity)).filter(
                ProductTransaction.product_uuid == p.uuid,
                ProductTransaction.transaction_type == "IN",
                ProductTransaction.created_at >= period_start,
                ProductTransaction.created_at <= period_end
            ).scalar() or 0.0
            produced_in_period = round(produced_in_period, 4)

            # 3. All sold during period (storewide)
            all_sold_in_period = db.session.query(func.sum(ProductTransaction.quantity)).filter(
                ProductTransaction.product_uuid == p.uuid,
                ProductTransaction.transaction_type == "OUT",
                ProductTransaction.created_at >= period_start,
                ProductTransaction.created_at <= period_end
            ).scalar() or 0.0
            all_sold_in_period = round(all_sold_in_period, 4)

            # 4. Sold during period (filtered by salesman if specified)
            if salesman:
                sold_in_period = db.session.query(func.sum(ProductTransaction.quantity)).join(
                    Order, ProductTransaction.order_uuid == Order.uuid
                ).filter(
                    ProductTransaction.product_uuid == p.uuid,
                    ProductTransaction.transaction_type == "OUT",
                    ProductTransaction.created_at >= period_start,
                    ProductTransaction.created_at <= period_end,
                    or_(Order.sold_by == salesman, Order.assigned_to == salesman)
                ).scalar() or 0.0
                sold_in_period = round(sold_in_period, 4)
            else:
                sold_in_period = all_sold_in_period

            closing_stock = max(round(opening_stock + produced_in_period - all_sold_in_period, 4), 0.0)
            current_stock = closing_stock
        else:
            opening_stock = 0.0

            total_in = db.session.query(func.sum(ProductTransaction.quantity)).filter(
                ProductTransaction.product_uuid == p.uuid,
                ProductTransaction.transaction_type == "IN"
            ).scalar() or 0.0
            produced_in_period = round(total_in, 4)

            total_out = db.session.query(func.sum(ProductTransaction.quantity)).filter(
                ProductTransaction.product_uuid == p.uuid,
                ProductTransaction.transaction_type == "OUT"
            ).scalar() or 0.0
            all_sold_in_period = round(total_out, 4)

            if salesman:
                sold_in_period = db.session.query(func.sum(ProductTransaction.quantity)).join(
                    Order, ProductTransaction.order_uuid == Order.uuid
                ).filter(
                    ProductTransaction.product_uuid == p.uuid,
                    ProductTransaction.transaction_type == "OUT",
                    or_(Order.sold_by == salesman, Order.assigned_to == salesman)
                ).scalar() or 0.0
                sold_in_period = round(sold_in_period, 4)
            else:
                sold_in_period = all_sold_in_period

            current_stock = max(round(total_in - total_out, 4), 0.0)
            closing_stock = current_stock

        sold_amount = round(sold_in_period * p.price, 2)

        result.append({
            "uuid": p.uuid,
            "name": p.name,
            "category_uuid": p.category_uuid,
            "category_name": category.name if category else None,
            "price": p.price,
            "stock_threshold": p.stock_threshold,
            "current_stock": current_stock,
            "opening_stock": opening_stock,
            "produced_in_period": produced_in_period,
            "sold_in_period": sold_in_period,
            "all_sold_in_period": all_sold_in_period,
            "closing_stock": closing_stock,
            "sold_amount": sold_amount
        })
    return jsonify(result), 200

@product_bp.route('/', methods=['POST'])
@require_permission('product:manage')
def add_product():
    from app.models.product import Product
    data = request.get_json()
    name = data.get('name')
    category_uuid = data.get('category_uuid')
    price = data.get('price', 0.0)
    stock_threshold = data.get('stock_threshold', 0.0)

    if not name:
        return jsonify({"error": "Product name is required"}), 400
    if not category_uuid:
        return jsonify({"error": "Category is required"}), 400
    if not ProductCategory.query.get(category_uuid):
        return jsonify({"error": "Category not found"}), 404

    product = Product(name=name, category_uuid=category_uuid, price=float(price), stock_threshold=float(stock_threshold))
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added successfully", "uuid": product.uuid}), 201

@product_bp.route('/<uuid>', methods=['PUT'])
@require_permission('product:manage')
def update_product(uuid):
    from app.models.product import Product
    product = Product.query.get_or_404(uuid)
    data = request.get_json()

    if 'name' in data:
        product.name = data['name']
    if 'category_uuid' in data:
        if not ProductCategory.query.get(data['category_uuid']):
            return jsonify({"error": "Category not found"}), 404
        product.category_uuid = data['category_uuid']
    if 'price' in data:
        product.price = float(data['price'])
    if 'stock_threshold' in data:
        product.stock_threshold = float(data['stock_threshold'])

    db.session.commit()
    return jsonify({"message": "Product updated successfully"}), 200

@product_bp.route('/<uuid>', methods=['DELETE'])
@require_permission('product:manage')
def delete_product(uuid):
    from app.models.product import Product
    product = Product.query.get_or_404(uuid)
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 200


