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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(product_bp, url_prefix='/api/products')
    
    # Register CLI commands
    @app.cli.command("seed-db")
    def seed_db():
        """Seeds the database with initial data."""
        from app.models.user import User, UserRole, UserStatus
        
        # Check if admin already exists
        if User.query.filter_by(username='chafi').first():
            print("Admin user already exists.")
            return

        admin = User(
            username='chafi',
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED
        )
        admin.set_password('chafi1795')
        
        db.session.add(admin)
        db.session.commit()
        print("Admin user 'chafi' created successfully.")

    @app.route('/health')
    def health_check():
        return {"status": "healthy"}, 200

    return app
