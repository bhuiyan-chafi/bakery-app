from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.user import User, UserPermissionStatus

def require_permission(*permission_names):
    """
    Decorator to protect endpoints with specific user-based permissions.
    Expects permission_names in format 'module:action' (e.g., 'user:create', 'product:view').
    Grants access if the user has AT LEAST ONE of the specified active permissions.
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
            
            # Check if user has at least one of the active permissions
            user_active_perms = {
                user_perm.permission.name
                for user_perm in user.permissions
                if (user_perm.status.value if hasattr(user_perm.status, 'value') else user_perm.status) == UserPermissionStatus.ACTIVE.value
            }
            
            if not any(perm in user_active_perms for perm in permission_names):
                perms_str = ", ".join(permission_names)
                return jsonify({"error": f"You do not have permission ({perms_str}) to access this resource"}), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper
