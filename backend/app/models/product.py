import uuid
from datetime import datetime
from enum import Enum
from app.extensions import db

class CategoryStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class ProductCategory(db.Model):
    __tablename__ = 'product_categories'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    parent = db.Column(db.String(36), default="0", nullable=False)
    status = db.Column(db.Enum(CategoryStatus), default=CategoryStatus.ACTIVE, nullable=False)

    def __repr__(self):
        return f'<ProductCategory {self.name}>'


class Product(db.Model):
    __tablename__ = 'products'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False, unique=True)
    category_uuid = db.Column(db.String(36), db.ForeignKey('product_categories.uuid'), nullable=False)
    price = db.Column(db.Float, nullable=False, default=0.0)
    stock_threshold = db.Column(db.Float, nullable=False, default=0.0)  # alert when stock <= this

    def __repr__(self):
        return f'<Product {self.name}>'


class Recipe(db.Model):
    __tablename__ = 'recipes'
    __table_args__ = (db.UniqueConstraint('product_uuid', 'name', name='uq_recipe_product_name'),)

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_uuid = db.Column(db.String(36), db.ForeignKey('products.uuid'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    instructions = db.Column(db.Text, nullable=True)

    ingredients = db.relationship('RecipeIngredient', backref='recipe', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Recipe {self.name} for product {self.product_uuid}>'

class RecipeIngredient(db.Model):
    __tablename__ = 'recipe_ingredients'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipe_uuid = db.Column(db.String(36), db.ForeignKey('recipes.uuid'), nullable=False)
    inventory_uuid = db.Column(db.String(36), db.ForeignKey('inventory.uuid'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)

    def __repr__(self):
        return f'<RecipeIngredient {self.inventory_uuid} x{self.quantity}>'



class ProductionStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"


class Production(db.Model):
    __tablename__ = 'productions'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_uuid = db.Column(db.String(36), db.ForeignKey('products.uuid'), nullable=False)
    recipe_uuid = db.Column(db.String(36), db.ForeignKey('recipes.uuid'), nullable=False)
    batch_quantity = db.Column(db.Float, nullable=False, default=1.0)
    damaged_quantity = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.Enum(ProductionStatus, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=ProductionStatus.PENDING)
    produced_at = db.Column(db.DateTime, nullable=True)  # set only when status → completed
    notes = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Production {self.uuid} - {self.status.value}>'


class ProductTransactionType(Enum):
    IN = "IN"    # units produced / received
    OUT = "OUT"  # units sold / consumed


class ProductTransaction(db.Model):
    __tablename__ = 'product_transactions'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_uuid = db.Column(db.String(36), db.ForeignKey('products.uuid'), nullable=False)
    production_uuid = db.Column(db.String(36), db.ForeignKey('productions.uuid'), nullable=True)  # null for manual OUT
    transaction_type = db.Column(
        db.Enum(ProductTransactionType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )
    quantity = db.Column(db.Float, nullable=False)  # always > 0; 1 for single, batch_qty for batch
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<ProductTransaction {self.transaction_type.value} x{self.quantity} for {self.product_uuid}>'
