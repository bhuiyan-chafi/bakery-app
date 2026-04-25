"""Add unique constraint on recipe product_uuid + name

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-04-26 01:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'j0k1l2m3n4o5'
down_revision = 'i9j0k1l2m3n4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint(
        'uq_recipe_product_name',
        'recipes',
        ['product_uuid', 'name']
    )


def downgrade():
    op.drop_constraint('uq_recipe_product_name', 'recipes', type_='unique')
