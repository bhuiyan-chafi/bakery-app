from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User, UserStatus
from datetime import datetime
from app.extensions import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/check-username', methods=['GET'])
def check_username():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Username parameter is required"}), 400
        
    user = User.query.filter_by(username=username).first()
    if user:
        return jsonify({"available": False, "message": "Username is already taken"}), 200
        
    return jsonify({"available": True, "message": "Username is available"}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    from app.models.user import UserRole
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username is already taken"}), 400

    new_user = User(
        username=username,
        role=UserRole.NORMAL,
        status=UserStatus.PENDING
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    
    # Optionally add user details
    if name:
        from app.models.user import UserDetails
        details = UserDetails(user_id=new_user.uuid, name=name)
        db.session.add(details)
        db.session.commit()

    return jsonify({"message": "Registration successful. Please wait for an admin to approve your account."}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401

    ALLOWED_STATUSES = {UserStatus.APPROVED, UserStatus.ACTIVE}
    if user.status not in ALLOWED_STATUSES:
        return jsonify({"error": f"Account is {user.status.value}. Please contact support."}), 403

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Create access token
    access_token = create_access_token(identity=user.uuid)

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "uuid": user.uuid,
            "username": user.username,
            "role": user.role.value,
            "status": user.status.value
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # Get user details safely
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

@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    from app.models.user import UserDetails
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    data = request.get_json()
    
    new_username = data.get('username')
    new_password = data.get('password')
    
    if new_username and new_username != user.username:
        if User.query.filter_by(username=new_username).first():
            return jsonify({"error": "Username already taken"}), 400
        user.username = new_username
        
    if new_password:
        user.set_password(new_password)
        
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
    
    return jsonify({
        "message": "Profile updated successfully",
        "user": {
            "uuid": user.uuid,
            "username": user.username,
            "role": user.role.value if hasattr(user.role, 'value') else user.role,
            "status": user.status.value if hasattr(user.status, 'value') else user.status,
            "name": user.details.name,
            "phone": user.details.phone,
            "address": user.details.address
        }
    }), 200

@auth_bp.route('/me/permissions', methods=['GET'])
@jwt_required()
def get_my_permissions():
    from app.models.user import Permission, UserPermissionStatus
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
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

@auth_bp.route('/me/permissions/<permission_uuid>', methods=['PUT'])
@jwt_required()
def update_my_permission(permission_uuid):
    from app.models.user import Permission, UserPermission, UserPermissionStatus
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    permission = Permission.query.get_or_404(permission_uuid)
    data = request.get_json()
    active = data.get('active', False)
    
    # Find existing UserPermission
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
    return jsonify({"message": "Permission updated successfully"}), 200

