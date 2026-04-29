from flask import Blueprint, request, jsonify
from app.models.user import User, UserDetails, UserStatus, UserRole, Permission, UserPermission, UserPermissionStatus
from app.extensions import db
from flask_jwt_extended import jwt_required
from datetime import datetime

user_bp = Blueprint('users', __name__)

@user_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    # Only return users that are NOT INACTIVE
    users = User.query.filter(User.status != UserStatus.INACTIVE).all()
    result = []
    for user in users:
        details = user.details
        result.append({
            "uuid": user.uuid,
            "username": user.username,
            "role": user.role.value if hasattr(user.role, 'value') else user.role,
            "status": user.status.value if hasattr(user.status, 'value') else user.status,
            "name": details.name if details else "",
            "phone": details.phone if details else "",
            "address": details.address if details else "",
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    return jsonify(result), 200

@user_bp.route('/<uuid>', methods=['GET'])
@jwt_required()
def get_user(uuid):
    user = User.query.get_or_404(uuid)
    details = user.details
    return jsonify({
        "uuid": user.uuid,
        "username": user.username,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "status": user.status.value if hasattr(user.status, 'value') else user.status,
        "name": details.name if details else "",
        "phone": details.phone if details else "",
        "address": details.address if details else "",
        "created_at": user.created_at.isoformat() if user.created_at else None
    }), 200

@user_bp.route('/<uuid>', methods=['PUT'])
@jwt_required()
def update_user(uuid):
    user = User.query.get_or_404(uuid)
    data = request.get_json()

    if 'username' in data and data['username'] != user.username:
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"error": "Username already taken"}), 400
        user.username = data['username']

    if 'password' in data and data['password']:
        user.set_password(data['password'])

    if 'role' in data:
        try:
            user.role = UserRole(data['role'])
        except ValueError:
            return jsonify({"error": "Invalid role"}), 400
    
    if 'status' in data:
        try:
            user.status = UserStatus(data['status'])
        except ValueError:
            return jsonify({"error": "Invalid status"}), 400

    # Update UserDetails
    if not user.details:
        user.details = UserDetails(user_id=user.uuid)
        db.session.add(user.details)
        
    if 'name' in data:
        user.details.name = data.get('name')
    if 'phone' in data:
        user.details.phone = data.get('phone')
    if 'address' in data:
        user.details.address = data.get('address')
        
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({"message": "User updated successfully"}), 200

@user_bp.route('/<uuid>', methods=['DELETE'])
@jwt_required()
def delete_user(uuid):
    user = User.query.get_or_404(uuid)
    
    # Validation
    status_val = user.status.value if hasattr(user.status, 'value') else user.status
    if status_val == UserStatus.ACTIVE.value:
        return jsonify({"error": "Cannot delete an ACTIVE user. Please change their status first."}), 400
        
    # Soft delete: wipe permissions and set status to INACTIVE
    UserPermission.query.filter_by(user_uuid=uuid).delete()
    user.status = UserStatus.INACTIVE
    db.session.commit()
    
    return jsonify({"message": "User deleted (made inactive) successfully"}), 200

@user_bp.route('/<uuid>/permissions', methods=['GET'])
@jwt_required()
def get_user_permissions(uuid):
    user = User.query.get_or_404(uuid)
    
    all_permissions = Permission.query.all()
    user_perms_dict = {
        up.permission_uuid: (up.status.value if hasattr(up.status, 'value') else up.status) == UserPermissionStatus.ACTIVE.value 
        for up in user.permissions
    }
    
    result = []
    for p in all_permissions:
        result.append({
            "permission_uuid": p.uuid,
            "name": p.name,
            "active": user_perms_dict.get(p.uuid, False)
        })
        
    return jsonify(result), 200

@user_bp.route('/<uuid>/permissions/<permission_uuid>', methods=['PUT'])
@jwt_required()
def update_user_permission(uuid, permission_uuid):
    user = User.query.get_or_404(uuid)
    permission = Permission.query.get_or_404(permission_uuid)
    
    data = request.get_json()
    active = data.get('active', False)
    
    user_perm = UserPermission.query.filter_by(user_uuid=user.uuid, permission_uuid=permission.uuid).first()
    new_status = UserPermissionStatus.ACTIVE if active else UserPermissionStatus.INACTIVE
    
    if user_perm:
        user_perm.status = new_status
    else:
        user_perm = UserPermission(
            user_uuid=user.uuid,
            permission_uuid=permission.uuid,
            status=new_status
        )
        db.session.add(user_perm)
        
    db.session.commit()
    return jsonify({"message": "User permission updated successfully"}), 200
