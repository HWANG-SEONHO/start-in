# 학습용 설명: model은 "DB 표의 설계도"입니다.
# class 하나가 테이블 하나이고, Column 하나가 엑셀의 한 칸 종류(열)라고 생각하면 쉽습니다.
# primary_key는 한 줄을 구별하는 대표 번호, ForeignKey는 다른 표의 줄을 가리키는 연결선입니다.

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    Integer,
    JSON,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)

from .database import Base


# -----------------------------------------------------------------------------
# 채용 서비스의 기본 데이터: 기업과 공고
# -----------------------------------------------------------------------------

class Company(Base):
    """기업 한 곳을 저장하는 테이블입니다."""

    __tablename__ = 'companies'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False, default='')
    size = Column(Integer, nullable=False, default=0)


class Job(Base):
    """채용공고 한 건을 저장하는 테이블입니다."""

    __tablename__ = 'jobs'

    # 기본 식별값과 기업 연결
    id = Column(Integer, primary_key=True)
    source_key = Column(String(64), nullable=True)
    company_id = Column(
        Integer,
        ForeignKey('companies.id', ondelete='RESTRICT'),
        nullable=False,
        index=True,
    )

    # 공고의 기본 검색정보
    title = Column(String(200), nullable=False)
    region = Column(String(20), nullable=False, index=True)
    district = Column(String(40), nullable=False)
    category = Column(String(40), nullable=False, index=True)
    education = Column(String(30), nullable=False)
    experience = Column(String(30), nullable=False)
    employment = Column(String(30), nullable=False)
    work_mode = Column(String(30), nullable=False)

    # 급여정보
    salary_type = Column(String(20), nullable=False)
    salary_min = Column(Integer, nullable=False)
    salary_max = Column(Integer, nullable=False)

    # 기업/직무의 추가 분류
    company_type = Column(String(30), nullable=False)
    industry = Column(String(30), nullable=False)

    # 여러 개 값을 가진 항목은 JSON 배열로 저장합니다.
    requirements = Column(JSON, nullable=False)
    conditions = Column(JSON, nullable=False)
    benefits = Column(JSON, nullable=False)
    tags = Column(JSON, nullable=False)

    # 상세 설명과 날짜
    description = Column(Text, nullable=False)
    deadline = Column(String(10), nullable=False)
    created_at = Column(String(30), nullable=False)
    is_demo = Column(Boolean, nullable=False, default=False)

    # 같은 source_key가 두 번 들어오는 것을 DB 단계에서도 막습니다.
    __table_args__ = (
        Index('uq_jobs_source_key', 'source_key', unique=True),
    )


# -----------------------------------------------------------------------------
# 회원과 로그인
# -----------------------------------------------------------------------------

class User(Base):
    """회원 한 명의 기본정보를 저장합니다."""

    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String(254), unique=True, nullable=False)
    name = Column(String(80), nullable=False)

    # 실제 비밀번호를 저장하지 않고 해시된 결과만 저장합니다.
    password_hash = Column(Text, nullable=False)


class Session(Base):
    """사용자가 로그인 중이라는 사실을 서버 쪽에서 기억합니다."""

    __tablename__ = 'sessions'

    # 브라우저 쿠키의 원본 토큰이 아니라 해시한 토큰을 기본키로 씁니다.
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    csrf_token = Column(String(64), nullable=False)
    expires_at = Column(Integer, nullable=False)


# -----------------------------------------------------------------------------
# 사용자가 공고에 하는 행동: 저장 / 지원
# -----------------------------------------------------------------------------

class SavedJob(Base):
    """어떤 사용자가 어떤 공고를 저장했는지 연결하는 표입니다."""

    __tablename__ = 'saved_jobs'

    # 두 칸을 함께 primary key로 사용해 같은 공고를 두 번 저장하지 못하게 합니다.
    user_id = Column(
        Integer,
        ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True,
    )
    job_id = Column(
        Integer,
        ForeignKey('jobs.id', ondelete='CASCADE'),
        primary_key=True,
    )


class Application(Base):
    """사용자의 지원상태와 메모를 공고에 연결해 저장합니다."""

    __tablename__ = 'applications'

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    job_id = Column(
        Integer,
        ForeignKey('jobs.id', ondelete='CASCADE'),
        nullable=False,
    )
    status = Column(String(20), nullable=False, default='준비중')
    note = Column(Text, nullable=False, default='')

    # 한 사용자는 같은 공고에 지원기록을 하나만 가질 수 있습니다.
    __table_args__ = (
        UniqueConstraint('user_id', 'job_id'),
    )


# -----------------------------------------------------------------------------
# 이력서
# -----------------------------------------------------------------------------

class Resume(Base):
    """사용자 한 명당 PDF 이력서 한 개를 DB에 저장합니다."""

    __tablename__ = 'resumes'

    # user_id가 primary key이므로 한 사용자가 동시에 여러 이력서를 가질 수 없습니다.
    user_id = Column(
        Integer,
        ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True,
    )
    filename = Column(String(200), nullable=False)
    size = Column(Integer, nullable=False)
    content = Column(LargeBinary, nullable=False)
