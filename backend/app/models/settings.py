import uuid
from app.extensions import db

class UnitMeasurement(db.Model):
    __tablename__ = 'unit_measurements'

    uuid = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    measurement = db.Column(db.String(50), nullable=False)

    def __repr__(self):
        return f'<UnitMeasurement {self.name}>'
