"""Create products table

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-26 00:27:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g7h8i9j0k1l2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'products',
        sa.Column('uuid', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('category_uuid', sa.String(36), sa.ForeignKey('product_categories.uuid'), nullable=False),
        sa.Column('price', sa.Float(), nullable=False, server_default='0.0'),
    )


def downgrade():
    op.drop_table('products')
