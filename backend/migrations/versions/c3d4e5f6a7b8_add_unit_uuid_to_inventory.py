"""Add unit_uuid to inventory table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-25 15:38:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('inventory',
        sa.Column('unit_uuid', sa.String(length=36), nullable=True)
    )
    op.create_foreign_key(
        'inventory_unit_uuid_fkey',
        'inventory', 'unit_measurements',
        ['unit_uuid'], ['uuid']
    )


def downgrade():
    op.drop_constraint('inventory_unit_uuid_fkey', 'inventory', type_='foreignkey')
    op.drop_column('inventory', 'unit_uuid')
