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
