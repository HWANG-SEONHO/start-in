# 학습용 설명: DB 구조를 한 단계씩 바꾸거나 되돌리는 Alembic 마이그레이션 파일입니다.
# 큰 흐름을 먼저 읽고, 각 함수 위의 주석을 따라가면 됩니다.

"""사용자당 한 개의 PDF와 메타데이터."""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

# DB 구조를 이 버전 앞으로 한 단계 적용합니다.
def upgrade():
    op.create_table('resumes',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('filename', sa.String(200), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False))

# DB 구조를 이 버전 이전으로 한 단계 되돌립니다.
def downgrade():
    op.drop_table('resumes')
