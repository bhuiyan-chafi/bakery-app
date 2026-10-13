from flask import Blueprint, request, jsonify
from app.extensions import db
from app.utils.decorators import require_permission

production_bp = Blueprint('productions', __name__)

@production_bp.route('/', methods=['GET'])
@require_permission('production:view', 'production:manage')
def get_productions():
    from app.models.product import Recipe, Production, ProductionStatus, ProductTransaction, ProductTransactionType, Product
    from sqlalchemy import case

    status_order = case(
        (Production.status == ProductionStatus.COMPLETED, 1),
        else_=0
    )

    productions = Production.query.order_by(
        status_order.asc(),
        Production.produced_at.desc().nullslast(),
        Production.uuid.desc()
    ).limit(100).all()

    result = []
    for p in productions:
        recipe = Recipe.query.get(p.recipe_uuid)

        product_txs = ProductTransaction.query.filter_by(
            production_uuid=p.uuid,
            transaction_type=ProductTransactionType.IN
        ).all()

        end_products = []
        for tx in product_txs:
            product = Product.query.get(tx.product_uuid)
            end_products.append({
                "uuid": tx.uuid,
                "product_uuid": tx.product_uuid,
                "product_name": product.name if product else None,
                "quantity": tx.quantity
            })

        result.append({
            "uuid": p.uuid,
            "recipe_uuid": p.recipe_uuid,
            "recipe_name": recipe.name if recipe else None,
            "status": p.status.value,
            "produced_at": p.produced_at.isoformat() if p.produced_at else None,
            "notes": p.notes,
            "end_products": end_products
        })
    return jsonify(result), 200


@production_bp.route('/', methods=['POST'])
@require_permission('production:manage')
def add_production():
    from app.models.product import Recipe, Production, ProductionStatus
    from app.models.inventory import Inventory, InventoryTransaction, TransactionType, TransactionStatus
    from app.models.settings import UnitMeasurement
    from sqlalchemy import func

    data = request.get_json()
    recipe_uuid = data.get('recipe_uuid')
    notes = data.get('notes', None)

    if not recipe_uuid:
        return jsonify({"error": "recipe_uuid is required"}), 400
    
    recipe = Recipe.query.get(recipe_uuid)
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404

    multiplier = 1.0

    # ── Stock check for every ingredient ──────────────────────────
    shortfalls = []
    deductions = []

    for ing in recipe.ingredients:
        required = round(ing.quantity * multiplier, 6)

        total_in = db.session.query(func.sum(InventoryTransaction.quantity)).filter(
            InventoryTransaction.inventory_uuid == ing.inventory_uuid,
            InventoryTransaction.transaction_type == TransactionType.IN,
            InventoryTransaction.status == TransactionStatus.APPROVED
        ).scalar() or 0.0

        total_out = db.session.query(func.sum(InventoryTransaction.quantity)).filter(
            InventoryTransaction.inventory_uuid == ing.inventory_uuid,
            InventoryTransaction.transaction_type == TransactionType.OUT,
            InventoryTransaction.status == TransactionStatus.APPROVED
        ).scalar() or 0.0

        current_stock = round(total_in - total_out, 6)

        inventory_item = Inventory.query.get(ing.inventory_uuid)
        unit = UnitMeasurement.query.get(inventory_item.unit_uuid) if inventory_item else None
        item_name = inventory_item.name if inventory_item else ing.inventory_uuid
        unit_label = unit.measurement if unit else "units"

        if current_stock < required:
            shortfalls.append({
                "inventory_name": item_name,
                "unit": unit_label,
                "required": required,
                "available": max(current_stock, 0.0),
                "shortfall": round(required - max(current_stock, 0.0), 6)
            })
        else:
            deductions.append({"inventory_uuid": ing.inventory_uuid, "quantity": required})

    if shortfalls:
        return jsonify({
            "error": "Insufficient stock to start production",
            "shortfalls": shortfalls
        }), 422

    # ── All checks passed: atomically create Production + OUT transactions ──
    production = Production(
        recipe_uuid=recipe_uuid,
        status=ProductionStatus.PENDING,
        produced_at=None,
        notes=notes
    )
    db.session.add(production)

    for d in deductions:
        db.session.add(InventoryTransaction(
            inventory_uuid=d["inventory_uuid"],
            quantity=d["quantity"],
            transaction_type=TransactionType.OUT,
            cost=0.0,
            status=TransactionStatus.APPROVED,
            supplier=None
        ))

    db.session.commit()
    return jsonify({"message": "Production started successfully", "uuid": production.uuid}), 201


@production_bp.route('/<prod_uuid>', methods=['PUT'])
@require_permission('production:manage')
def update_production(prod_uuid):
    from app.models.product import Production, ProductionStatus, ProductTransaction, ProductTransactionType, Product
    from datetime import datetime as dt

    production = Production.query.get_or_404(prod_uuid)
    data = request.get_json() or {}

    new_status_val = data.get('status')
    if new_status_val:
        try:
            new_status = ProductionStatus(new_status_val)
            production.status = new_status
            if new_status == ProductionStatus.COMPLETED and not production.produced_at:
                production.produced_at = dt.utcnow()
        except ValueError:
            return jsonify({"error": f"Invalid status. Must be one of: {[e.value for e in ProductionStatus]}"}), 400

    if 'notes' in data:
        production.notes = data.get('notes')

    if 'end_products' in data:
        end_products = data.get('end_products')
        if not isinstance(end_products, list):
            return jsonify({"error": "end_products must be a list"}), 400

        validated_items = []
        for ep in end_products:
            prod_id = ep.get('product_uuid')
            qty = ep.get('quantity')

            try:
                qty_float = float(qty)
            except (TypeError, ValueError):
                return jsonify({"error": "Quantity must be a valid number."}), 400

            if not prod_id or qty_float <= 0:
                return jsonify({"error": "Ensure all products have a valid selection and quantity > 0."}), 400

            if not Product.query.get(prod_id):
                return jsonify({"error": f"Product with ID {prod_id} not found."}), 404

            validated_items.append((prod_id, qty_float))

        # Clear existing IN transactions for this production run
        ProductTransaction.query.filter_by(
            production_uuid=production.uuid,
            transaction_type=ProductTransactionType.IN
        ).delete()

        # Add updated IN transactions
        for prod_id, qty_float in validated_items:
            product_tx = ProductTransaction(
                product_uuid=prod_id,
                production_uuid=production.uuid,
                recipe_uuid=production.recipe_uuid,
                transaction_type=ProductTransactionType.IN,
                quantity=qty_float,
                notes=f"Generated from production run {production.uuid}"
            )
            db.session.add(product_tx)

        if production.status == ProductionStatus.COMPLETED and not production.produced_at:
            production.produced_at = dt.utcnow()

    db.session.commit()
    return jsonify({"message": "Production updated successfully"}), 200


@production_bp.route('/<prod_uuid>', methods=['DELETE'])
@require_permission('production:manage')
def delete_production(prod_uuid):
    from app.models.product import Production, ProductTransaction
    production = Production.query.get_or_404(prod_uuid)
    ProductTransaction.query.filter_by(production_uuid=production.uuid).delete()
    db.session.delete(production)
    db.session.commit()
    return jsonify({"message": "Production deleted"}), 200


@production_bp.route('/active', methods=['GET'])
@require_permission('production:view', 'production:manage')
def get_active_productions_count():
    from app.models.product import Production, ProductionStatus
    count = Production.query.filter_by(status=ProductionStatus.RUNNING).count()
    return jsonify({"count": count}), 200
