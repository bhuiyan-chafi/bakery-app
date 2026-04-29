import uuid
from datetime import datetime
from enum import Enum
from app.extensions import db


class OrderType(Enum):
    SHOP = "shop"
    PICKUP = "pickup"
    DELIVERY = "delivery"


class OrderStatus(Enum):
    PENDING = "pending"
    COMPLETE = "complete"
    CANCELLED = "cancelled"


class DiscountType(Enum):
    AMOUNT = "amount"
    PERCENT = "percent"


class Order(db.Model):
    __tablename__ = 'orders'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = db.Column(db.String(20), unique=True, nullable=False)

    # Customer
    customer_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)

    # Order meta
    order_type = db.Column(
        db.Enum(OrderType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=OrderType.SHOP,
    )
    status = db.Column(
        db.Enum(OrderStatus, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=OrderStatus.PENDING,
    )

    # Financials
    discount_type = db.Column(
        db.Enum(DiscountType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=DiscountType.AMOUNT,
    )
    discount_value = db.Column(db.Float, nullable=False, default=0.0)  # raw input (amt or %)
    discount_amount = db.Column(db.Float, nullable=False, default=0.0)  # resolved dollar value
    subtotal = db.Column(db.Float, nullable=False, default=0.0)
    total = db.Column(db.Float, nullable=False, default=0.0)

    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Order {self.order_number} – {self.status.value}>'


class OrderItem(db.Model):
    __tablename__ = 'order_items'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_uuid = db.Column(db.String(36), db.ForeignKey('orders.uuid'), nullable=False)
    product_uuid = db.Column(db.String(36), db.ForeignKey('products.uuid'), nullable=False)

    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    line_total = db.Column(db.Float, nullable=False)  # unit_price × quantity

    def __repr__(self):
        return f'<OrderItem {self.product_uuid} ×{self.quantity}>'
