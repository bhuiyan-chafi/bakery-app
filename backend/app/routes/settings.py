from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.settings import UnitMeasurement
from app.extensions import db
from app.utils.decorators import require_permission

settings_bp = Blueprint('settings', __name__)

# --- Measurement Units ---

@settings_bp.route('/measurement-unit', methods=['GET'])
@require_permission(
    'settings:measurement-unit',
    'inventory:view', 'inventory:add', 'inventory:view-purchase', 'inventory:manage-purchase',
    'recipe:view', 'recipe:manage',
    'production:view', 'production:manage',
    'product:view', 'product:manage',
    'user:manage'
)
def get_measurement_units():
    units = UnitMeasurement.query.all()
    return jsonify([{
        "uuid": unit.uuid,
        "name": unit.name,
        "measurement": unit.measurement
    } for unit in units]), 200

@settings_bp.route('/measurement-unit', methods=['POST'])
@require_permission('settings:measurement-unit')
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
@require_permission('settings:measurement-unit')
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
@require_permission('settings:measurement-unit')
def delete_measurement_unit(uuid):
    unit = UnitMeasurement.query.get_or_404(uuid)
    db.session.delete(unit)
    db.session.commit()
    return jsonify({"message": "Measurement unit deleted successfully"}), 200

# --- Permissions Management ---

@settings_bp.route('/permissions', methods=['GET'])
@require_permission('user:manage')
def get_permissions():
    from app.models.user import Permission
    permissions = Permission.query.all()
    return jsonify([{
        "uuid": p.uuid,
        "name": p.name
    } for p in permissions]), 200

@settings_bp.route('/permissions', methods=['POST'])
@require_permission('user:manage')
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
@require_permission('user:manage')
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
@require_permission('user:manage')
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

# --- Database Backup ---

@settings_bp.route('/backup/download', methods=['GET'])
@jwt_required()
def download_backup():
    import os
    import subprocess
    from datetime import datetime
    from flask import send_file
    from flask_jwt_extended import get_jwt_identity
    from app.models.user import User

    # Verify user
    current_user_uuid = get_jwt_identity()
    user = User.query.get(current_user_uuid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"db_backup_{timestamp}.sql.gz"
    filepath = os.path.join("/tmp", filename)
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return jsonify({"error": "DATABASE_URL not set"}), 500

    bash_cmd = f"pg_dump '{database_url}' | gzip > {filepath}"
    
    try:
        subprocess.run(bash_cmd, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Failed to generate backup: {e}"}), 500
        
    return send_file(filepath, as_attachment=True, download_name=filename)


@settings_bp.route('/backup/upload', methods=['POST'])
@jwt_required()
def upload_backup():
    import os
    import subprocess
    from flask import request
    from flask_jwt_extended import get_jwt_identity
    from app.models.user import User

    # Verify user
    current_user_uuid = get_jwt_identity()
    user = User.query.get(current_user_uuid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return jsonify({"error": "DATABASE_URL not set"}), 500

    # Save uploaded file
    filepath = os.path.join("/tmp", "restore_upload.sql.gz")
    file.save(filepath)

    try:
        from app.extensions import db
        from sqlalchemy import text
        
        # Clear any pending transaction to release locks on our own connection
        db.session.rollback()

        # Force disconnect all OTHER sessions using the active SQLAlchemy connection.
        # This preserves our current connection so Flask can return the HTTP response cleanly.
        db.session.execute(text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();"))
        db.session.commit()

        # Dispose the engine pool so SQLAlchemy doesn't try to reuse the idle connections we just killed
        db.engine.dispose()
        
        # First, drop and recreate the public schema to ensure a clean slate
        # This prevents duplicate key errors when restoring over existing data
        clean_cmd = f'psql "{database_url}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
        subprocess.run(clean_cmd, shell=True, check=True)
        
        # Then, restore the backup
        # zcat -f safely handles BOTH gzipped (.sql.gz) and plain (.sql) files
        restore_cmd = f'zcat -f "{filepath}" | psql "{database_url}"'
        subprocess.run(restore_cmd, shell=True, check=True)
        
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Database restoration failed: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)
            
    return jsonify({"message": "Database restored successfully. Please log in again."}), 200


