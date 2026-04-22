import uuid
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
