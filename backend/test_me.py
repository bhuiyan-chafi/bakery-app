from app import create_app
from app.models.user import User

app = create_app()
with app.app_context():
    admin = User.query.filter_by(username="admin").first()
    if admin:
        print(admin.uuid)
        print(admin.role.value)
        print(admin.status.value)
        print(admin.created_at.isoformat() if admin.created_at else None)
    else:
        print("Admin not found")
