"""Add unique constraint to inventory name

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-25 15:40:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint('uq_inventory_name', 'inventory', ['name'])


def downgrade():
    op.drop_constraint('uq_inventory_name', 'inventory', type_='unique')
