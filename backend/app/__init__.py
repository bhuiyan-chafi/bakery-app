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

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    cors.init_app(app)
    jwt.init_app(app)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.product import product_bp
    from app.routes.settings import settings_bp
    from app.routes.inventory import inventory_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(product_bp, url_prefix='/api/products')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')

    # Import all models so Alembic can detect them for migrations
    from app.models import user, product, settings, inventory  # noqa: F401

    
    # Register CLI commands
    @app.cli.command("seed-db")
    def seed_db():
        """Seeds the database with initial data."""
        from app.models.user import User, UserRole, UserStatus

        admin_username = os.getenv('SEED_ADMIN_USERNAME')
        admin_password = os.getenv('SEED_ADMIN_PASSWORD')

        if not admin_username or not admin_password:
            print("ERROR: SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be set in the environment.")
            return

        # Check if admin already exists
        if User.query.filter_by(username=admin_username).first():
            print("Admin user already exists.")
            return

        admin = User(
            username=admin_username,
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED
        )
        admin.set_password(admin_password)

        db.session.add(admin)
        db.session.commit()
        print(f"Admin user '{admin_username}' created successfully.")


    @app.route('/health')
    def health_check():
        return {"status": "healthy"}, 200

    return app
