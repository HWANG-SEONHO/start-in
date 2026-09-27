# 학습용 설명: DB 구조를 한 단계씩 바꾸거나 되돌리는 Alembic 마이그레이션 파일입니다.
# 큰 흐름을 먼저 읽고, 각 함수 위의 주석을 따라가면 됩니다.

"""기존 6개 테이블의 고정된 기준 스키마. 현재 models 변경과 분리합니다."""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, UniqueConstraint, Boolean
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import inspect
from alembic import op

# 이 class가 관련 데이터와 규칙을 한 묶음으로 정의합니다.
class Base(DeclarativeBase):
    pass

# 기업 한 곳을 저장하는 DB 테이블입니다.
class Company(Base):
    __tablename__ = 'companies'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False, default='')
    size = Column(Integer, nullable=False, default=0)

# 채용공고 한 건을 저장하는 DB 테이블입니다.
class Job(Base):
    __tablename__ = 'jobs'
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='RESTRICT'), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    region = Column(String(20), nullable=False, index=True)
    district = Column(String(40), nullable=False)
    category = Column(String(40), nullable=False, index=True)
    education = Column(String(30), nullable=False)
    experience = Column(String(30), nullable=False)
    employment = Column(String(30), nullable=False)
    work_mode = Column(String(30), nullable=False)
    salary_type = Column(String(20), nullable=False)
    salary_min = Column(Integer, nullable=False)
    salary_max = Column(Integer, nullable=False)
    company_type = Column(String(30), nullable=False)
    industry = Column(String(30), nullable=False)
    requirements = Column(JSON, nullable=False)
    conditions = Column(JSON, nullable=False)
    benefits = Column(JSON, nullable=False)
    tags = Column(JSON, nullable=False)
    description = Column(Text, nullable=False)
    deadline = Column(String(10), nullable=False)
    created_at = Column(String(30), nullable=False)
    is_demo = Column(Boolean, nullable=False, default=False)

# 회원 한 명의 기본정보와 암호화된 비밀번호를 저장합니다.
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(254), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    password_hash = Column(Text, nullable=False)

# 로그인 상태를 기억하는 서버 쪽 세션 테이블입니다.
class Session(Base):
    __tablename__ = 'sessions'
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    csrf_token = Column(String(64), nullable=False)
    expires_at = Column(Integer, nullable=False)

# 어떤 사용자가 어떤 공고를 저장했는지 연결합니다.
class SavedJob(Base):
    __tablename__ = 'saved_jobs'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True)

# 사용자의 지원현황과 메모를 공고에 연결해 저장합니다.
class Application(Base):
    __tablename__ = 'applications'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), nullable=False, default='준비중')
    note = Column(Text, nullable=False, default='')
    __table_args__ = (UniqueConstraint('user_id', 'job_id'),)

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

# DB 구조를 이 버전 앞으로 한 단계 적용합니다.
def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    # 이전 create_all DB는 같은 기준 스키마인지 확인한 뒤 이력에 편입합니다.
    for table in Base.metadata.sorted_tables:
        if inspector.has_table(table.name):
            actual = {column['name'] for column in inspector.get_columns(table.name)}
            if actual != set(table.columns.keys()):
                raise RuntimeError(f'Baseline schema mismatch: {table.name}')
    Base.metadata.create_all(bind)

# DB 구조를 이 버전 이전으로 한 단계 되돌립니다.
def downgrade():
    Base.metadata.drop_all(op.get_bind())
