from flask import Blueprint, request, jsonify
from app.models.settings import UnitMeasurement
from app.extensions import db

settings_bp = Blueprint('settings', __name__)

# --- Measurement Units ---

@settings_bp.route('/measurement-unit', methods=['GET'])
def get_measurement_units():
    units = UnitMeasurement.query.all()
    return jsonify([{
        "uuid": unit.uuid,
        "name": unit.name,
        "measurement": unit.measurement
    } for unit in units]), 200

@settings_bp.route('/measurement-unit', methods=['POST'])
def add_measurement_unit():
    data = request.get_json()
    name = data.get('name')
    measurement = data.get('measurement')

    if not name or not measurement:
        return jsonify({"error": "Both 'name' and 'measurement' fields are required"}), 400

    unit = UnitMeasurement(name=name, measurement=measurement)
    db.session.add(unit)
    db.session.commit()

    return jsonify({"message": "Measurement unit added successfully", "uuid": unit.uuid}), 201

@settings_bp.route('/measurement-unit/<uuid>', methods=['PUT'])
def update_measurement_unit(uuid):
    unit = UnitMeasurement.query.get_or_404(uuid)
    data = request.get_json()

    if 'name' in data:
        unit.name = data['name']
    if 'measurement' in data:
        unit.measurement = data['measurement']

    db.session.commit()
    return jsonify({"message": "Measurement unit updated successfully"}), 200

@settings_bp.route('/measurement-unit/<uuid>', methods=['DELETE'])
def delete_measurement_unit(uuid):
    unit = UnitMeasurement.query.get_or_404(uuid)
    db.session.delete(unit)
    db.session.commit()
    return jsonify({"message": "Measurement unit deleted successfully"}), 200

# --- Permissions Management ---

@settings_bp.route('/permissions', methods=['GET'])
def get_permissions():
    from app.models.user import Permission
    permissions = Permission.query.all()
    return jsonify([{
        "uuid": p.uuid,
        "name": p.name
    } for p in permissions]), 200

@settings_bp.route('/permissions', methods=['POST'])
def add_permission():
    from app.models.user import Permission
    data = request.get_json()
    name = data.get('name')

    if not name:
        return jsonify({"error": "Permission 'name' is required"}), 400
        
    name = name.strip()
    if Permission.query.filter_by(name=name).first():
        return jsonify({"error": f"Permission '{name}' already exists"}), 400

    permission = Permission(name=name)
    db.session.add(permission)
    db.session.commit()

    return jsonify({"message": "Permission added successfully", "uuid": permission.uuid}), 201

@settings_bp.route('/permissions/<uuid>', methods=['PUT'])
def update_permission(uuid):
    from app.models.user import Permission
    permission = Permission.query.get_or_404(uuid)
    data = request.get_json()

    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({"error": "Permission 'name' cannot be empty"}), 400
        if Permission.query.filter(Permission.name == name, Permission.uuid != uuid).first():
            return jsonify({"error": f"Permission '{name}' already exists"}), 400
        permission.name = name

    db.session.commit()
    return jsonify({"message": "Permission updated successfully"}), 200

@settings_bp.route('/permissions/<uuid>', methods=['DELETE'])
def delete_permission(uuid):
    from app.models.user import Permission, UserPermission
    permission = Permission.query.get_or_404(uuid)
    
    # Check if permission is in use
    in_use = UserPermission.query.filter_by(permission_uuid=uuid).first()
    if in_use:
        return jsonify({"error": "Cannot delete permission because it is currently assigned to one or more users."}), 400
        
    db.session.delete(permission)
    db.session.commit()
    return jsonify({"message": "Permission deleted successfully"}), 200

