"""Create recipes and recipe_ingredients tables

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-04-26 00:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'recipes',
        sa.Column('uuid', sa.String(36), primary_key=True),
        sa.Column('product_uuid', sa.String(36), sa.ForeignKey('products.uuid'), nullable=False, unique=True),
        sa.Column('instructions', sa.Text(), nullable=True),
    )
    op.create_table(
        'recipe_ingredients',
        sa.Column('uuid', sa.String(36), primary_key=True),
        sa.Column('recipe_uuid', sa.String(36), sa.ForeignKey('recipes.uuid'), nullable=False),
        sa.Column('inventory_uuid', sa.String(36), sa.ForeignKey('inventory.uuid'), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
    )


def downgrade():
    op.drop_table('recipe_ingredients')
    op.drop_table('recipes')
