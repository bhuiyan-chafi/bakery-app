from flask import Blueprint, request, jsonify
from app.models.user import User, UserDetails, UserStatus, Permission, UserPermission, UserPermissionStatus
from app.extensions import db
from flask_jwt_extended import jwt_required
from app.utils.decorators import require_permission
from datetime import datetime

user_bp = Blueprint('users', __name__)

@user_bp.route('/', methods=['GET'])
@require_permission('user:manage', 'staff:view', 'staff:edit', 'staff:management')
def get_users():
    # Only return users that are NOT INACTIVE
    users = User.query.filter(User.status != UserStatus.INACTIVE).all()
    result = []
    for user in users:
        details = user.details
        result.append({
            "uuid": user.uuid,
            "username": user.username,
            "status": user.status.value if hasattr(user.status, 'value') else user.status,
            "name": details.name if details else "",
            "phone": details.phone if details else "",
            "address": details.address if details else "",
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    return jsonify(result), 200

@user_bp.route('/<uuid>', methods=['GET'])
@require_permission('user:manage', 'staff:edit', 'staff:management', 'staff:view')
def get_user(uuid):
    user = User.query.get_or_404(uuid)
    details = user.details
    return jsonify({
        "uuid": user.uuid,
        "username": user.username,
        "status": user.status.value if hasattr(user.status, 'value') else user.status,
        "name": details.name if details else "",
        "phone": details.phone if details else "",
        "address": details.address if details else "",
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }), 200

@user_bp.route('/<uuid>', methods=['PUT'])
@require_permission('user:manage', 'staff:edit')
def update_user(uuid):
    user = User.query.get_or_404(uuid)
    data = request.get_json()

    if 'username' in data and data['username'] != user.username:
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"error": "Username already taken"}), 400
        user.username = data['username']

    if 'password' in data and data['password']:
        user.set_password(data['password'])
    
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
@require_permission('user:manage')
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
@require_permission('user:manage')
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
@require_permission('user:manage')
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


# --- User Other Information (dynamic key-value pairs) ---

@user_bp.route('/<uuid>/other-info', methods=['GET'])
@require_permission('user:manage', 'staff:edit', 'staff:management', 'staff:view')
def get_user_other_info(uuid):
    from app.models.user import UserOtherInformation
    User.query.get_or_404(uuid)  # Ensure user exists
    items = UserOtherInformation.query.filter_by(user_uuid=uuid).order_by(UserOtherInformation.created_at).all()
    return jsonify([{
        "uuid": item.uuid,
        "field_title": item.field_title,
        "field_value": item.field_value,
        "created_at": item.created_at.isoformat() if item.created_at else None
    } for item in items]), 200


@user_bp.route('/<uuid>/other-info', methods=['POST'])
@require_permission('user:manage', 'staff:edit')
def add_user_other_info(uuid):
    from app.models.user import UserOtherInformation
    User.query.get_or_404(uuid)  # Ensure user exists
    data = request.get_json()

    field_title = (data.get('field_title') or '').strip()
    field_value = (data.get('field_value') or '').strip()

    if not field_title or not field_value:
        return jsonify({"error": "Both 'field_title' and 'field_value' are required"}), 400

    item = UserOtherInformation(user_uuid=uuid, field_title=field_title, field_value=field_value)
    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Information added successfully", "uuid": item.uuid}), 201


@user_bp.route('/<uuid>/other-info/<info_uuid>', methods=['DELETE'])
@require_permission('user:manage', 'staff:edit')
def delete_user_other_info(uuid, info_uuid):
    from app.models.user import UserOtherInformation
    item = UserOtherInformation.query.filter_by(uuid=info_uuid, user_uuid=uuid).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Information deleted successfully"}), 200

# --- Staff Salary Management ---

@user_bp.route('/<uuid>/salary', methods=['GET'])
@require_permission('staff:management')
def get_user_salaries(uuid):
    from app.models.miscellaneous import MiscellaneousTransaction
    User.query.get_or_404(uuid)
    
    # Optional filter by month: YYYY-MM
    month = request.args.get('month')
    
    query = MiscellaneousTransaction.query.filter(
        MiscellaneousTransaction.transaction_type == 'expense'
    )
    
    if month:
        query = query.filter(MiscellaneousTransaction.transaction_on == f"{uuid}:salary:{month}")
    else:
        query = query.filter(MiscellaneousTransaction.transaction_on.like(f"{uuid}:salary:%"))
        
    transactions = query.order_by(MiscellaneousTransaction.transaction_date.desc()).all()
    
    return jsonify([t.to_dict() for t in transactions]), 200

@user_bp.route('/<uuid>/salary', methods=['POST'])
@require_permission('staff:management')
def add_user_salary(uuid):
    from app.models.miscellaneous import MiscellaneousTransaction
    from zoneinfo import ZoneInfo
    User.query.get_or_404(uuid)
    data = request.get_json()
    
    amount = data.get('amount')
    month = data.get('month') # expected YYYY-MM
    
    if amount is None or not month:
        return jsonify({"error": "Both 'amount' and 'month' are required"}), 400
        
    transaction_on = f"{uuid}:salary:{month}"
    
    # Check if already settled
    existing = MiscellaneousTransaction.query.filter_by(
        transaction_type='expense',
        transaction_on=transaction_on
    ).first()
    
    if existing:
        return jsonify({"error": "Salary already settled for this month"}), 409
        
    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"error": "Invalid amount format"}), 400
        
    WAT = ZoneInfo('Africa/Lagos')
    today = datetime.now(WAT).date()
        
    transaction = MiscellaneousTransaction(
        transaction_type='expense',
        transaction_on=transaction_on,
        amount=amount,
        transaction_date=today
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({"message": "Salary settled successfully", "record": transaction.to_dict()}), 201
