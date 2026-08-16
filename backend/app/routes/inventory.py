from flask import Blueprint, request, jsonify
from app.models.inventory import Inventory, InventoryTransaction, TransactionType, TransactionStatus
from app.models.settings import UnitMeasurement
from app.extensions import db
from app.utils.decorators import require_permission
from sqlalchemy import func

inventory_bp = Blueprint('inventory', __name__)

# --- Inventory Items ---

@inventory_bp.route('/', methods=['GET'])
@require_permission('inventory:view', 'inventory:add', 'inventory:view-purchase', 'inventory:manage-purchase')
def get_inventory():
    items = Inventory.query.order_by(Inventory.name).limit(50).all()
    result = []
    for item in items:
        unit = UnitMeasurement.query.get(item.unit_uuid)

        # Sum quantities of approved IN transactions
        total_in = db.session.query(func.sum(InventoryTransaction.quantity)).filter(
            InventoryTransaction.inventory_uuid == item.uuid,
            InventoryTransaction.transaction_type == TransactionType.IN,
            InventoryTransaction.status == TransactionStatus.APPROVED
        ).scalar() or 0.0

        # Sum quantities of approved OUT transactions
        total_out = db.session.query(func.sum(InventoryTransaction.quantity)).filter(
            InventoryTransaction.inventory_uuid == item.uuid,
            InventoryTransaction.transaction_type == TransactionType.OUT,
            InventoryTransaction.status == TransactionStatus.APPROVED
        ).scalar() or 0.0

        current_stock = total_in - total_out

        result.append({
            "uuid": item.uuid,
            "name": item.name,
            "unit_uuid": item.unit_uuid,
            "unit_measurement": unit.measurement if unit else None,
            "quantity_alert": item.quantity_alert,
            "current_stock": round(current_stock, 4)
        })
    return jsonify(result), 200

@inventory_bp.route('/', methods=['POST'])
@require_permission('inventory:add')
def add_inventory():
    data = request.get_json()
    name = data.get('name')
    unit_uuid = data.get('unit_uuid')
    quantity_alert = data.get('quantity_alert', 0.0)

    if not name:
        return jsonify({"error": "Inventory name is required"}), 400
    if not unit_uuid:
        return jsonify({"error": "Unit of measurement is required"}), 400

    unit = UnitMeasurement.query.get(unit_uuid)
    if not unit:
        return jsonify({"error": "Unit of measurement not found"}), 404

    item = Inventory(name=name, unit_uuid=unit_uuid, quantity_alert=float(quantity_alert))
    db.session.add(item)
    db.session.commit()
    return jsonify({"message": "Inventory item added successfully", "uuid": item.uuid}), 201

@inventory_bp.route('/<uuid>', methods=['PUT'])
@require_permission('inventory:add')
def update_inventory(uuid):
    item = Inventory.query.get_or_404(uuid)
    data = request.get_json()

    if 'name' in data:
        item.name = data['name']
    if 'unit_uuid' in data:
        unit = UnitMeasurement.query.get(data['unit_uuid'])
        if not unit:
            return jsonify({"error": "Unit of measurement not found"}), 404
        item.unit_uuid = data['unit_uuid']
    if 'quantity_alert' in data:
        item.quantity_alert = float(data['quantity_alert'])

    db.session.commit()
    return jsonify({"message": "Inventory item updated successfully"}), 200

@inventory_bp.route('/<uuid>', methods=['DELETE'])
@require_permission('inventory:add')
def delete_inventory(uuid):
    item = Inventory.query.get_or_404(uuid)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Inventory item deleted successfully"}), 200


# --- Inventory Transactions ---

@inventory_bp.route('/transactions', methods=['GET'])
@require_permission('inventory:view-purchase', 'inventory:manage-purchase')
def get_transactions():
    transactions = InventoryTransaction.query.order_by(
        InventoryTransaction.datetime.desc()
    ).limit(50).all()

    result = []
    for t in transactions:
        inventory = Inventory.query.get(t.inventory_uuid)
        unit = UnitMeasurement.query.get(inventory.unit_uuid) if inventory else None
        result.append({
            "uuid": t.uuid,
            "inventory_uuid": t.inventory_uuid,
            "inventory_name": inventory.name if inventory else None,
            "unit_measurement": unit.measurement if unit else None,
            "quantity": t.quantity,
            "transaction_type": t.transaction_type.value,
            "cost": t.cost,
            "datetime": t.datetime.isoformat(),
            "status": t.status.value,
            "supplier": t.supplier
        })
    return jsonify(result), 200

@inventory_bp.route('/transactions', methods=['POST'])
@require_permission('inventory:manage-purchase')
def add_transaction():
    data = request.get_json()
    inventory_uuid = data.get('inventory_uuid')
    quantity = data.get('quantity')
    transaction_type = data.get('transaction_type')
    cost = data.get('cost', 0.0)
    status = data.get('status', 'PENDING')
    supplier = data.get('supplier', None)

    if not inventory_uuid:
        return jsonify({"error": "inventory_uuid is required"}), 400
    if quantity is None:
        return jsonify({"error": "quantity is required"}), 400
    if float(quantity) <= 0:
        return jsonify({"error": "quantity must be greater than zero"}), 400
    if not transaction_type:
        return jsonify({"error": "transaction_type is required"}), 400

    if not Inventory.query.get(inventory_uuid):
        return jsonify({"error": "Inventory item not found"}), 404

    try:
        t_type = TransactionType(transaction_type)
    except ValueError:
        return jsonify({"error": f"Invalid transaction_type. Must be one of: {[e.value for e in TransactionType]}"}), 400

    try:
        t_status = TransactionStatus(status)
    except ValueError:
        return jsonify({"error": f"Invalid status. Must be one of: {[e.value for e in TransactionStatus]}"}), 400

    transaction = InventoryTransaction(
        inventory_uuid=inventory_uuid,
        quantity=float(quantity),
        transaction_type=t_type,
        cost=float(cost),
        status=t_status,
        supplier=supplier
    )
    db.session.add(transaction)
    db.session.commit()
    return jsonify({"message": "Transaction recorded successfully", "uuid": transaction.uuid}), 201

@inventory_bp.route('/transactions/<uuid>', methods=['PUT'])
@require_permission('inventory:manage-purchase')
def update_transaction(uuid):
    transaction = InventoryTransaction.query.get_or_404(uuid)
    data = request.get_json()

    if 'inventory_uuid' in data:
        if not Inventory.query.get(data['inventory_uuid']):
            return jsonify({"error": "Inventory item not found"}), 404
        transaction.inventory_uuid = data['inventory_uuid']

    if 'quantity' in data:
        if float(data['quantity']) <= 0:
            return jsonify({"error": "quantity must be greater than zero"}), 400
        transaction.quantity = float(data['quantity'])

    if 'transaction_type' in data:
        try:
            transaction.transaction_type = TransactionType(data['transaction_type'])
        except ValueError:
            return jsonify({"error": f"Invalid transaction_type. Must be one of: {[e.value for e in TransactionType]}"}), 400

    if 'cost' in data:
        transaction.cost = float(data['cost'])

    if 'status' in data:
        try:
            transaction.status = TransactionStatus(data['status'])
        except ValueError:
            return jsonify({"error": f"Invalid status. Must be one of: {[e.value for e in TransactionStatus]}"}), 400

    if 'supplier' in data:
        transaction.supplier = data['supplier']

    db.session.commit()
    return jsonify({"message": "Transaction updated successfully"}), 200

@inventory_bp.route('/transactions/<uuid>', methods=['DELETE'])
@require_permission('inventory:manage-purchase')
def delete_transaction(uuid):
    transaction = InventoryTransaction.query.get_or_404(uuid)
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({"message": "Transaction deleted successfully"}), 200
