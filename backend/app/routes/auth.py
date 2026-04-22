from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app.models.user import User, UserStatus
from datetime import datetime
from app.extensions import db

auth_bp = Blueprint('auth', __name__)

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

    if user.status != UserStatus.APPROVED:
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
