# 학습용 설명: DB 구조를 한 단계씩 바꾸거나 되돌리는 Alembic 마이그레이션 파일입니다.
# 큰 흐름을 먼저 읽고, 각 함수 위의 주석을 따라가면 됩니다.

"""중복 가져오기를 막기 위한 공고 원본 키."""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

# DB 구조를 이 버전 앞으로 한 단계 적용합니다.
def upgrade():
    op.add_column('jobs', sa.Column('source_key', sa.String(64), nullable=True))
    op.create_index('uq_jobs_source_key', 'jobs', ['source_key'], unique=True)

# DB 구조를 이 버전 이전으로 한 단계 되돌립니다.
def downgrade():
    op.drop_index('uq_jobs_source_key', table_name='jobs')
    op.drop_column('jobs', 'source_key')
