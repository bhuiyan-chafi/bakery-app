"""Add quantity to inventory_transactions

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-25 16:24:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('inventory_transactions',
        sa.Column('quantity', sa.Float(), nullable=True)
    )


def downgrade():
    op.drop_column('inventory_transactions', 'quantity')
