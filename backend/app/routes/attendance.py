from flask import Blueprint, request, jsonify
from app.extensions import db
from app.utils.decorators import require_permission
from datetime import datetime, date
from zoneinfo import ZoneInfo

attendance_bp = Blueprint('attendance', __name__)

WAT = ZoneInfo('Africa/Lagos')


def today_wat() -> date:
    """Return today's date in West Africa Time (UTC+1)."""
    return datetime.now(WAT).date()


def now_wat() -> datetime:
    """Return current datetime in WAT (stored as naive datetime)."""
    return datetime.now(WAT).replace(tzinfo=None)


def _serialize(record):
    return {
        "uuid":          record.uuid,
        "user_uuid":     record.user_uuid,
        "date":          record.date.isoformat(),
        "status":        record.status.value,
        "working_day":   record.working_day,
        "note":          record.note,
        "clocked_in_at": record.clocked_in_at.isoformat() if record.clocked_in_at else None,
        "resolved_at":   record.resolved_at.isoformat() if record.resolved_at else None,
    }


# ── GET /api/attendance/today ─────────────────────────────────────────────────
# Returns today's attendance record for every non-admin user (null if none exists).
@attendance_bp.route('/today', methods=['GET'])
@require_permission('staff:management')
def get_today_attendance():
    from app.models.user import User, UserStatus, StaffAttendance
    today = today_wat()

    users = User.query.filter(
        User.status != UserStatus.INACTIVE,
        User.username != 'admin'
    ).all()

    result = {}
    for u in users:
        record = StaffAttendance.query.filter_by(user_uuid=u.uuid, date=today).first()
        result[u.uuid] = _serialize(record) if record else None

    return jsonify(result), 200


# ── GET /api/attendance/<user_uuid>/last-attended ─────────────────────────────
@attendance_bp.route('/<user_uuid>/last-attended', methods=['GET'])
@require_permission('staff:management')
def get_last_attended(user_uuid):
    from app.models.user import StaffAttendance, AttendanceStatus
    record = (
        StaffAttendance.query
        .filter(
            StaffAttendance.user_uuid == user_uuid,
            StaffAttendance.status != AttendanceStatus.CLOCKED_IN
        )
        .order_by(StaffAttendance.date.desc())
        .first()
    )
    if not record:
        return jsonify({"last_attended": None}), 200
    return jsonify({"last_attended": record.date.isoformat()}), 200


# ── GET /api/attendance/<user_uuid>/history ───────────────────────────────────
@attendance_bp.route('/<user_uuid>/history', methods=['GET'])
@require_permission('staff:management')
def get_attendance_history(user_uuid):
    from app.models.user import User, StaffAttendance
    from datetime import timedelta
    
    User.query.get_or_404(user_uuid)
    
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    today = today_wat()
    
    try:
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = today
            
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
            start_date = today - timedelta(days=7)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    records = (
        StaffAttendance.query
        .filter(
            StaffAttendance.user_uuid == user_uuid,
            StaffAttendance.date >= start_date,
            StaffAttendance.date <= end_date
        )
        .order_by(StaffAttendance.date.desc())
        .all()
    )
    
    return jsonify([_serialize(r) for r in records]), 200




# ── POST /api/attendance/<user_uuid>/clock-in ─────────────────────────────────
@attendance_bp.route('/<user_uuid>/clock-in', methods=['POST'])
@require_permission('staff:management')
def clock_in(user_uuid):
    from app.models.user import User, StaffAttendance, AttendanceStatus
    from sqlalchemy.exc import IntegrityError

    User.query.get_or_404(user_uuid)
    today = today_wat()

    # Check if already clocked in today
    existing = StaffAttendance.query.filter_by(user_uuid=user_uuid, date=today).first()
    if existing:
        return jsonify({"error": "Already clocked in for today", "record": _serialize(existing)}), 409

    record = StaffAttendance(
        user_uuid=user_uuid,
        date=today,
        status=AttendanceStatus.CLOCKED_IN,
        working_day=0.0,
        clocked_in_at=now_wat()
    )
    db.session.add(record)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Clock-in record already exists for today"}), 409

    return jsonify({"message": "Clocked in successfully", "record": _serialize(record)}), 201


# ── PATCH /api/attendance/<user_uuid>/resolve ──────────────────────────────────
# body: { "action": "excused"|"not_excused"|"half_day"|"clock_out", "note": "..." }
@attendance_bp.route('/<user_uuid>/resolve', methods=['PATCH'])
@require_permission('staff:management')
def resolve_attendance(user_uuid):
    from app.models.user import StaffAttendance, AttendanceStatus

    today = today_wat()
    record = StaffAttendance.query.filter_by(user_uuid=user_uuid, date=today).first()

    if not record:
        return jsonify({"error": "No clock-in record found for today"}), 404

    if record.status != AttendanceStatus.CLOCKED_IN:
        return jsonify({"error": "Attendance for today is already finalized", "record": _serialize(record)}), 409

    data = request.get_json() or {}
    action = data.get('action', '').strip()
    note = (data.get('note') or '').strip() or None

    ACTIONS_REQUIRING_NOTE = {'excused', 'not_excused', 'half_day'}

    if action not in {'excused', 'not_excused', 'half_day', 'clock_out'}:
        return jsonify({"error": "Invalid action. Must be one of: excused, not_excused, half_day, clock_out"}), 400

    if action in ACTIONS_REQUIRING_NOTE and not note:
        return jsonify({"error": f"A note is required for action '{action}'"}), 400

    if action == 'clock_out':
        record.status = AttendanceStatus.CLOCKED_OUT
        record.working_day = 1.0
    elif action == 'excused':
        record.status = AttendanceStatus.EXCUSED
        record.working_day = 1.0
        record.note = note
    elif action == 'half_day':
        record.status = AttendanceStatus.HALF_DAY
        record.working_day = 0.5
        record.note = note
    elif action == 'not_excused':
        record.status = AttendanceStatus.NOT_EXCUSED
        record.working_day = 0.0
        record.note = note

    record.resolved_at = now_wat()
    db.session.commit()

    return jsonify({"message": "Attendance updated successfully", "record": _serialize(record)}), 200
