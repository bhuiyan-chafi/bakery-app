import uuid
from datetime import datetime
from enum import Enum
from app.extensions import db, bcrypt

class UserRole(Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    NORMAL = "normal"

class UserStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"
    APPROVED = "approved"

class UserPermissionStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class User(db.Model):
    __tablename__ = 'users'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum(UserRole), default=UserRole.NORMAL, nullable=False)
    status = db.Column(db.Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to UserDetails
    details = db.relationship('UserDetails', backref='user', uselist=False, cascade="all, delete-orphan")
    
    # Relationship to UserPermissions
    permissions = db.relationship('UserPermission', backref='user', cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class UserDetails(db.Model):
    __tablename__ = 'user_details'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.uuid'), nullable=False, unique=True)
    name = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<UserDetails for {self.user_id}>'

class Permission(db.Model):
    __tablename__ = 'permissions'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False) # e.g. "user:create", "order:read"

    def __repr__(self):
        return f'<Permission {self.name}>'

class UserPermission(db.Model):
    __tablename__ = 'user_permissions'
    __table_args__ = (
        db.UniqueConstraint('user_uuid', 'permission_uuid', name='uq_user_permission'),
    )

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_uuid = db.Column(db.String(36), db.ForeignKey('users.uuid'), nullable=False)
    permission_uuid = db.Column(db.String(36), db.ForeignKey('permissions.uuid'), nullable=False)
    status = db.Column(db.Enum(UserPermissionStatus), default=UserPermissionStatus.ACTIVE, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to the Permission model
    permission = db.relationship('Permission', backref='user_assignments')

    def __repr__(self):
        return f'<UserPermission {self.user_uuid} - {self.permission_uuid}>'
