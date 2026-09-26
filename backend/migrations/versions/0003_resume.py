"""사용자당 한 개의 PDF와 메타데이터."""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('resumes',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('filename', sa.String(200), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False))

def downgrade():
    op.drop_table('resumes')
