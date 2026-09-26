"""중복 가져오기를 막기 위한 공고 원본 키."""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('jobs', sa.Column('source_key', sa.String(64), nullable=True))
    op.create_index('uq_jobs_source_key', 'jobs', ['source_key'], unique=True)

def downgrade():
    op.drop_index('uq_jobs_source_key', table_name='jobs')
    op.drop_column('jobs', 'source_key')
