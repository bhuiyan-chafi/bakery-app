"""Drop category_uuid from inventory table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-25 15:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('inventory_category_uuid_fkey', 'inventory', type_='foreignkey')
    op.drop_column('inventory', 'category_uuid')


def downgrade():
    op.add_column('inventory', sa.Column('category_uuid', sa.String(length=36), nullable=True))
    op.create_foreign_key(
        'inventory_category_uuid_fkey',
        'inventory', 'product_categories',
        ['category_uuid'], ['uuid']
    )
