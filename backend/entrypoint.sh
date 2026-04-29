#!/bin/sh

set -e

echo "Waiting for database..."

echo "Creating database tables from models..."
python -c "
from app import create_app
from app.extensions import db

app = create_app()
with app.app_context():
    db.create_all()
    print('All tables created.')
"

echo "Seeding database..."
flask seed-db

echo "Starting application..."
exec python app.py
