import uuid
from datetime import datetime, timezone
from app.extensions import db

class MiscellaneousTransaction(db.Model):
    __tablename__ = 'miscellaneous_transactions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    uuid = db.Column(db.String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False) # 'income' or 'expense'
    transaction_on = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<MiscellaneousTransaction {self.uuid} - {self.transaction_type} - {self.amount}>'

    def to_dict(self):
        return {
            'uuid': self.uuid,
            'transaction_type': self.transaction_type,
            'transaction_on': self.transaction_on,
            'amount': self.amount,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
