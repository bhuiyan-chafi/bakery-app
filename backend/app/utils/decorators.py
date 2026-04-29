from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.user import User, UserPermissionStatus

def require_permission(permission_name):
    """
    Decorator to protect endpoints with specific user-based permissions.
    Expects permission_name in format 'module:action' (e.g., 'user:create').
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Ensure JWT is present and valid
            verify_jwt_in_request()
            
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            # Admin users automatically bypass permission checks
            role_val = user.role.value if hasattr(user.role, 'value') else user.role
            from app.models.user import UserRole
            if role_val == UserRole.ADMIN.value:
                return fn(*args, **kwargs)
            
            # Check if user has the active permission
            has_permission = False
            for user_perm in user.permissions:
                # Need to safely check the enum value
                status_val = user_perm.status.value if hasattr(user_perm.status, 'value') else user_perm.status
                
                if status_val == UserPermissionStatus.ACTIVE.value and user_perm.permission.name == permission_name:
                    has_permission = True
                    break
            
            if not has_permission:
                return jsonify({"error": f"You do not have permission '{permission_name}' to access this resource"}), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper
