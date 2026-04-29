"""Create product_transactions table

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-04-28 10:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'l2m3n4o5p6q7'
down_revision = 'k1l2m3n4o5p6'
branch_labels = None
depends_on = None

product_tx_type_enum = sa.Enum('IN', 'OUT', name='producttransactiontype')


def upgrade():
    product_tx_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'product_transactions',
        sa.Column('uuid', sa.String(36), primary_key=True),
        sa.Column('product_uuid', sa.String(36), sa.ForeignKey('products.uuid'), nullable=False),
        sa.Column('production_uuid', sa.String(36), sa.ForeignKey('productions.uuid'), nullable=True),
        sa.Column('transaction_type', product_tx_type_enum, nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('product_transactions')
    product_tx_type_enum.drop(op.get_bind(), checkfirst=True)
