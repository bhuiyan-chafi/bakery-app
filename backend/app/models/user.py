import uuid
from datetime import datetime
from enum import Enum
from app.extensions import db, bcrypt

class UserStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

class UserPermissionStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class User(db.Model):
    __tablename__ = 'users'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
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


class UserOtherInformation(db.Model):
    __tablename__ = 'user_other_information'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_uuid = db.Column(db.String(36), db.ForeignKey('users.uuid'), nullable=False)
    field_title = db.Column(db.String(100), nullable=False)
    field_value = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('other_information', cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<UserOtherInformation {self.user_uuid}: {self.field_title}>'


class AttendanceStatus(Enum):
    CLOCKED_IN   = 'clocked_in'
    EXCUSED      = 'excused'
    NOT_EXCUSED  = 'not_excused'
    HALF_DAY     = 'half_day'
    CLOCKED_OUT  = 'clocked_out'


class StaffAttendance(db.Model):
    __tablename__ = 'staff_attendance'
    __table_args__ = (
        db.UniqueConstraint('user_uuid', 'date', name='uq_attendance_user_date'),
    )

    uuid           = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_uuid      = db.Column(db.String(36), db.ForeignKey('users.uuid'), nullable=False)
    date           = db.Column(db.Date, nullable=False)  # WAT date
    status         = db.Column(db.Enum(AttendanceStatus), default=AttendanceStatus.CLOCKED_IN, nullable=False)
    working_day    = db.Column(db.Float, default=0.0, nullable=False)  # 0.0 | 0.5 | 1.0
    note           = db.Column(db.Text, nullable=True)
    clocked_in_at  = db.Column(db.DateTime, nullable=True)
    resolved_at    = db.Column(db.DateTime, nullable=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('attendance_records', cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<StaffAttendance {self.user_uuid} {self.date} {self.status.value}>'
