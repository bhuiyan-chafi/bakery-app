"""Add recipe name, drop recipe unique constraint, create productions table

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-04-26 00:58:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'i9j0k1l2m3n4'
down_revision = 'h8i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the unique constraint on recipes.product_uuid
    op.drop_constraint('recipes_product_uuid_key', 'recipes', type_='unique')

    # Add name column to recipes
    op.add_column('recipes',
        sa.Column('name', sa.String(100), nullable=True, server_default='Default')
    )

    # Create productions table
    op.create_table(
        'productions',
        sa.Column('uuid', sa.String(36), primary_key=True),
        sa.Column('product_uuid', sa.String(36), sa.ForeignKey('products.uuid'), nullable=False),
        sa.Column('recipe_uuid', sa.String(36), sa.ForeignKey('recipes.uuid'), nullable=False),
        sa.Column('yield_type', sa.Enum('single', 'batch', name='yieldtype'), nullable=False),
        sa.Column('batch_quantity', sa.Float(), nullable=True),
        sa.Column('produced_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('productions')
    op.drop_column('recipes', 'name')
    op.create_unique_constraint('recipes_product_uuid_key', 'recipes', ['product_uuid'])
