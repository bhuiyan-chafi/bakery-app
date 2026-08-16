from flask import Blueprint, request, jsonify
from app.extensions import db
from app.utils.decorators import require_permission

production_bp = Blueprint('productions', __name__)

@production_bp.route('/', methods=['GET'])
@require_permission('production:view', 'production:manage')
def get_productions():
    from app.models.product import Recipe, Production
    productions = Production.query.order_by(
        Production.produced_at.desc().nullslast()
    ).limit(50).all()

    result = []
    for p in productions:
        recipe = Recipe.query.get(p.recipe_uuid)
        result.append({
            "uuid": p.uuid,
            "recipe_uuid": p.recipe_uuid,
            "recipe_name": recipe.name if recipe else None,
            "status": p.status.value,
            "produced_at": p.produced_at.isoformat() if p.produced_at else None,
            "notes": p.notes
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
def update_production_status(prod_uuid):
    from app.models.product import Production, ProductionStatus, ProductTransaction, ProductTransactionType, Product
    from datetime import datetime as dt

    production = Production.query.get_or_404(prod_uuid)
    data = request.get_json()
    new_status_val = data.get('status')

    if not new_status_val:
        return jsonify({"error": "status is required"}), 400

    try:
        new_status = ProductionStatus(new_status_val)
    except ValueError:
        return jsonify({"error": f"Invalid status. Must be one of: {[e.value for e in ProductionStatus]}"}), 400

    production.status = new_status

    if new_status == ProductionStatus.COMPLETED:
        end_products = data.get('end_products', [])
        
        for ep in end_products:
            prod_id = ep.get('product_uuid')
            qty = ep.get('quantity')
            
            if not prod_id or not qty or float(qty) <= 0:
                return jsonify({"error": "Invalid end products data. Ensure all products have a valid quantity > 0."}), 400
                
            if not Product.query.get(prod_id):
                return jsonify({"error": f"Product with ID {prod_id} not found."}), 404

            product_tx = ProductTransaction(
                product_uuid=prod_id,
                production_uuid=production.uuid,
                recipe_uuid=production.recipe_uuid,
                transaction_type=ProductTransactionType.IN,
                quantity=float(qty),
                notes=f"Generated from production run {production.uuid}"
            )
            db.session.add(product_tx)
            
        production.produced_at = dt.utcnow()

    db.session.commit()
    return jsonify({"message": f"Status updated to '{new_status_val}'"}), 200


@production_bp.route('/<prod_uuid>', methods=['DELETE'])
@require_permission('production:manage')
def delete_production(prod_uuid):
    from app.models.product import Production
    production = Production.query.get_or_404(prod_uuid)
    db.session.delete(production)
    db.session.commit()
    return jsonify({"message": "Production deleted"}), 200


@production_bp.route('/active', methods=['GET'])
@require_permission('production:view', 'production:manage')
def get_active_productions_count():
    from app.models.product import Production, ProductionStatus
    count = Production.query.filter_by(status=ProductionStatus.RUNNING).count()
    return jsonify({"count": count}), 200
