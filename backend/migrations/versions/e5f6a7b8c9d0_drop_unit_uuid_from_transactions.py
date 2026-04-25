"""Drop unit_uuid from inventory_transactions table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-25 16:08:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('inventory_transactions_unit_uuid_fkey', 'inventory_transactions', type_='foreignkey')
    op.drop_column('inventory_transactions', 'unit_uuid')


def downgrade():
    import sqlalchemy as sa
    op.add_column('inventory_transactions',
        sa.Column('unit_uuid', sa.String(length=36), nullable=True)
    )
    op.create_foreign_key(
        'inventory_transactions_unit_uuid_fkey',
        'inventory_transactions', 'unit_measurements',
        ['unit_uuid'], ['uuid']
    )
