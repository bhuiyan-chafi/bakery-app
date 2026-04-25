"""Add status column to productions, make produced_at nullable

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
Create Date: 2026-04-26 01:18:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'k1l2m3n4o5p6'
down_revision = 'j0k1l2m3n4o5'
branch_labels = None
depends_on = None

# Declare the enum explicitly so we can create/drop it in PostgreSQL
production_status_enum = sa.Enum('pending', 'running', 'completed', name='productionstatus')


def upgrade():
    # Must create the PostgreSQL enum type before using it in ALTER TABLE
    production_status_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('productions',
        sa.Column('status', production_status_enum, nullable=False, server_default='pending')
    )
    op.alter_column('productions', 'produced_at', nullable=True)


def downgrade():
    op.alter_column('productions', 'produced_at', nullable=False)
    op.drop_column('productions', 'status')
    production_status_enum.drop(op.get_bind(), checkfirst=True)
