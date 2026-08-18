import os
from flask import Flask
from app.extensions import db, migrate, bcrypt, cors, jwt

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours

    # Nigeria timezone (WAT = UTC+1)
    os.environ.setdefault('TZ', 'Africa/Lagos')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    cors.init_app(app)
    jwt.init_app(app)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.product import product_bp
    from app.routes.recipe import recipe_bp
    from app.routes.production import production_bp
    from app.routes.settings import settings_bp
    from app.routes.inventory import inventory_bp
    from app.routes.order import order_bp
    from app.routes.user import user_bp
    from app.routes.miscellaneous import miscellaneous_bp
    from app.routes.accounts import accounts_bp
    from app.routes.attendance import attendance_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(product_bp, url_prefix='/api/products')
    app.register_blueprint(recipe_bp, url_prefix='/api/recipes')
    app.register_blueprint(production_bp, url_prefix='/api/productions')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(miscellaneous_bp, url_prefix='/api/miscellaneous')
    app.register_blueprint(accounts_bp, url_prefix='/api/accounts')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')

    # Import all models so Alembic can detect them for migrations
    from app.models import user, product, settings, inventory, order, miscellaneous  # noqa: F401

    
    # Register CLI commands
    @app.cli.command("seed-db")
    def seed_db():
        """Seeds the database with initial data."""
        from app.models.user import User, UserStatus, Permission, UserPermission, UserPermissionStatus

        # 1. Ensure initial permissions exist
        initial_perms = [
            'user:manage',
            'product:view', 'product:manage',
            'recipe:view', 'recipe:manage',
            'production:view', 'production:manage',
            'inventory:view', 'inventory:add',
            'inventory:view-purchase', 'inventory:manage-purchase',
            'order:view', 'order:manage',
            'account:view', 'account:manage',
            'sale:view', 'sale:orders',
            'settings:measurement-unit',
            'staff:view', 'staff:edit', 'staff:management'
        ]
        perm_objects = {}
        for perm_name in initial_perms:
            p = Permission.query.filter_by(name=perm_name).first()
            if not p:
                p = Permission(name=perm_name)
                db.session.add(p)
                db.session.commit()
                print(f"Permission '{perm_name}' created.")
            else:
                print(f"Permission '{perm_name}' already exists.")
            perm_objects[perm_name] = p

        admin_username = os.getenv('SEED_ADMIN_USERNAME')
        admin_password = os.getenv('SEED_ADMIN_PASSWORD')

        if not admin_username or not admin_password:
            print("ERROR: SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be set in the environment.")
            return

        # 2. Check if admin user exists, otherwise create
        admin = User.query.filter_by(username=admin_username).first()
        if not admin:
            admin = User(
                username=admin_username,
                status=UserStatus.ACTIVE
            )
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            print(f"Admin user '{admin_username}' created successfully.")
        else:
            print(f"Admin user '{admin_username}' already exists.")

        # 3. Ensure admin has active initial permissions
        for perm_name, p in perm_objects.items():
            admin_perm = UserPermission.query.filter_by(user_uuid=admin.uuid, permission_uuid=p.uuid).first()
            if not admin_perm:
                admin_perm = UserPermission(
                    user_uuid=admin.uuid,
                    permission_uuid=p.uuid,
                    status=UserPermissionStatus.ACTIVE
                )
                db.session.add(admin_perm)
                db.session.commit()
                print(f"Assigned '{perm_name}' permission to '{admin_username}'.")
            elif admin_perm.status != UserPermissionStatus.ACTIVE:
                admin_perm.status = UserPermissionStatus.ACTIVE
                db.session.commit()
                print(f"Activated '{perm_name}' permission for '{admin_username}'.")


    @app.route('/health')
    def health_check():
        return {"status": "healthy"}, 200

    return app
