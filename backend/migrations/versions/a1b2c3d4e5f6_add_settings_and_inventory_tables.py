"""Add settings and inventory tables

Revision ID: a1b2c3d4e5f6
Revises: 951f3ffaa09f
Create Date: 2026-04-25 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '951f3ffaa09f'
branch_labels = None
depends_on = None


def upgrade():
    # ### unit_measurements table ###
    op.create_table('unit_measurements',
    sa.Column('uuid', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('measurement', sa.String(length=50), nullable=False),
    sa.PrimaryKeyConstraint('uuid')
    )

    # ### inventory table ###
    op.create_table('inventory',
    sa.Column('uuid', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('category_uuid', sa.String(length=36), nullable=False),
    sa.Column('quantity_alert', sa.Float(), nullable=False),
    sa.ForeignKeyConstraint(['category_uuid'], ['product_categories.uuid'], ),
    sa.PrimaryKeyConstraint('uuid')
    )

    # ### inventory_transactions table ###
    op.create_table('inventory_transactions',
    sa.Column('uuid', sa.String(length=36), nullable=False),
    sa.Column('inventory_uuid', sa.String(length=36), nullable=False),
    sa.Column('unit_uuid', sa.String(length=36), nullable=False),
    sa.Column('transaction_type', sa.Enum('IN', 'OUT', name='transactiontype'), nullable=False),
    sa.Column('cost', sa.Float(), nullable=False),
    sa.Column('datetime', sa.DateTime(), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', name='transactionstatus'), nullable=False),
    sa.Column('supplier', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['inventory_uuid'], ['inventory.uuid'], ),
    sa.ForeignKeyConstraint(['unit_uuid'], ['unit_measurements.uuid'], ),
    sa.PrimaryKeyConstraint('uuid')
    )


def downgrade():
    op.drop_table('inventory_transactions')
    op.drop_table('inventory')
    op.drop_table('unit_measurements')
