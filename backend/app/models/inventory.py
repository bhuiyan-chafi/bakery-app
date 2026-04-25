import uuid
from datetime import datetime
from enum import Enum
from app.extensions import db

class TransactionType(Enum):
    IN = "IN"
    OUT = "OUT"

class TransactionStatus(Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Inventory(db.Model):
    __tablename__ = 'inventory'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False, unique=True)
    unit_uuid = db.Column(db.String(36), db.ForeignKey('unit_measurements.uuid'), nullable=False)
    quantity_alert = db.Column(db.Float, nullable=False, default=0.0)

    def __repr__(self):
        return f'<Inventory {self.name}>'


class InventoryTransaction(db.Model):
    __tablename__ = 'inventory_transactions'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inventory_uuid = db.Column(db.String(36), db.ForeignKey('inventory.uuid'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.Enum(TransactionType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    cost = db.Column(db.Float, nullable=False, default=0.0)
    datetime = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.Enum(TransactionStatus, values_callable=lambda obj: [e.value for e in obj]), default=TransactionStatus.PENDING, nullable=False)
    supplier = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<InventoryTransaction {self.uuid} - {self.transaction_type.value}>'
