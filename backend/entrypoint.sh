#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Waiting for database..."
# You could add a wait-for-it script here if needed, 
# but docker-compose healthchecks usually handle this.

echo "Applying database migrations..."
if [ ! -d "migrations" ]; then
    flask db init
fi
flask db migrate -m "Initial migration" || true
flask db upgrade

echo "Seeding database..."
flask seed-db

echo "Starting application..."
exec python app.py
