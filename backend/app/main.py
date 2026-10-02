# 학습용 설명: 이 파일은 START IN의 FastAPI "교통센터"입니다.
# 브라우저 요청을 받으면 → 값 검사 → DB 읽기/쓰기 → JSON 응답 순서로 처리합니다.
# 처음 읽을 때는 아래 "공통 준비 → 인증 → 공고검색 → MY 기능" 순서만 따라가면 됩니다.

import hashlib
import hmac
import json
import os
import secrets
import time
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

from alembic import command
from alembic.config import Config
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as OrmSession

from .ai_search import (
    SearchInterpretation,
    SearchRequest,
    interpret,
    validate_conditions,
)
from .database import Base, engine, get_db
from .models import Application, Company, Job, Resume, SavedJob, Session, User
from .seed import seed
from .schemas import (
    ApplicationOut,
    ApplicationUpdate,
    CompanyOut,
    JobOut,
    JobPage,
    Login,
    Registration,
    ResumeOut,
    SessionOut,
)

# -----------------------------------------------------------------------------
# 1. 서버 공통 설정
# -----------------------------------------------------------------------------

# React 개발서버처럼 이 API를 호출해도 되는 웹주소 목록입니다.
ORIGINS = os.getenv(
    'CORS_ORIGINS',
    'http://127.0.0.1:5173,http://localhost:5173',
).split(',')

# HTTPS 배포에서는 COOKIE_SECURE=true로 두어 쿠키가 안전한 연결에서만 움직이게 합니다.
COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
COOKIE_NAME = 'startin_session'

# PasswordHasher는 비밀번호 원문 대신 안전한 Argon2 hash를 만들고 비교합니다.
password_hasher = PasswordHasher()

# 존재하지 않는 이메일로 로그인해도 비밀번호 검사는 비슷하게 수행해 시간차이를 줄입니다.
DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(20))


# 프로젝트 루트입니다. migration 폴더처럼 프로젝트 기준 경로를 만들 때 사용합니다.
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def alembic_config(connection):
    """지금 연결한 DB를 Alembic이 그대로 사용하도록 설정을 만듭니다.

    쉽게 말하면, DB 구조 변경 설명서(Alembic)에게
    "다른 DB 말고 지금 이 DB를 고쳐"라고 알려주는 함수입니다.

    Windows는 .ini 파일을 읽을 때 PC의 기본 글자 인코딩(cp949)을
    사용할 수 있습니다. 그래서 한글 주석이 들어간 alembic.ini를 직접 읽으면
    서버 시작이 멈출 수 있습니다. 서버 실행에서는 필요한 설정을 Python으로
    직접 넣어, PC 글자 인코딩과 상관없이 같은 방식으로 동작하게 합니다.
    """
    config = Config()
    config.set_main_option(
        'script_location',
        str(PROJECT_ROOT / 'backend' / 'migrations'),
    )
    config.attributes['connection'] = connection
    return config


def repair_legacy_sqlite(connection):
    """예전 로컬 DB를 현재 구조로 안전하게 이어 붙입니다.

    예전 START IN에는 기업/공고만 있고 로그인용 sessions 같은 표가 없던
    버전이 있었습니다. 기존 데이터는 지우지 않고, 빠진 표만 뒤에서
    create_all이 만들 수 있게 준비합니다.

    jobs의 source_key는 과거 버전에 실제로 없었던 것으로 확인된 한 칸이라
    이 경우만 자동으로 추가합니다. 그 밖의 낯선 구조 차이는 멋대로
    고치지 않고 오류를 내서 데이터 손상을 막습니다.
    """
    inspector = inspect(connection)
    current_tables = set(inspector.get_table_names())

    for table in Base.metadata.sorted_tables:
        if table.name not in current_tables:
            continue

        actual_columns = {column['name'] for column in inspector.get_columns(table.name)}
        expected_columns = set(table.columns.keys())
        missing = expected_columns - actual_columns
        extra = actual_columns - expected_columns

        # START IN의 알려진 과거 DB 차이: jobs.source_key가 없던 버전.
        if table.name == 'jobs' and missing == {'source_key'} and not extra:
            connection.execute(text('ALTER TABLE jobs ADD COLUMN source_key VARCHAR(64)'))
            connection.execute(
                text(
                    'CREATE UNIQUE INDEX IF NOT EXISTS '
                    'uq_jobs_source_key ON jobs (source_key)'
                )
            )
            continue

        if missing or extra:
            raise RuntimeError(
                '로컬 DB 구조가 현재 START IN과 다릅니다. '
                f'{table.name}: missing={sorted(missing)}, extra={sorted(extra)}'
            )


def prepare_local_database():
    """로컬 SQLite는 uvicorn만 켜도 바로 사용할 수 있게 준비합니다.

    1) 이미 Alembic 이력이 있으면 최신 migration까지 올립니다.
    2) 예전 DB라면 기존 데이터는 유지하고 현재 표 구조에 맞춥니다.
    3) 완전히 빈 DB면 현재 표를 만들고 1,000개 데모 공고를 넣습니다.

    PostgreSQL은 배포 DB일 수 있으므로 자동 변경하지 않습니다.
    """
    if engine.dialect.name != 'sqlite':
        return

    with engine.begin() as connection:
        inspector = inspect(connection)
        has_migration_history = inspector.has_table('alembic_version')
        config = alembic_config(connection)

        if has_migration_history:
            command.upgrade(config, 'head')
        else:
            repair_legacy_sqlite(connection)
            Base.metadata.create_all(connection)
            # 지금 구조가 최신 모델과 같으므로 Alembic에게 현재 위치를 기록합니다.
            command.stamp(config, 'head')

    # 데이터가 하나도 없는 새 로컬 DB라면 기능 확인용 1,000건을 넣습니다.
    with OrmSession(engine, expire_on_commit=False) as db:
        seed(db)


# FastAPI가 시작될 때 로컬 DB 구조를 먼저 준비하고 연결을 확인합니다.
@asynccontextmanager
async def lifespan(_):
    # 자동 테스트는 자체 임시 DB를 주입하므로 실제 로컬 DB를 만지지 않습니다.
    if get_db not in app.dependency_overrides:
        prepare_local_database()
    with engine.connect() as connection:
        connection.execute(select(1))
    yield


app = FastAPI(
    title='STARTIN API',
    version='0.1.0',
    lifespan=lifespan,
)

# CORS는 "이 웹주소에서 온 브라우저 요청은 허용" 같은 출처 규칙입니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allow_headers=['Content-Type', 'X-CSRF-Token'],
)


# 데이터를 바꾸는 요청의 출처를 확인하고 기본 보안 header를 붙입니다.
@app.middleware('http')
async def protect_origin(request: Request, call_next):
    # 함수 안에서만 쓰므로 여기서 import해 시작 시 의존을 단순하게 유지합니다.
    from fastapi.responses import JSONResponse

    changing_methods = {'POST', 'PUT', 'PATCH', 'DELETE'}

    if request.method in changing_methods:
        origin = request.headers.get('origin')
        if origin and origin not in ORIGINS:
            return JSONResponse(
                {'detail': '허용되지 않은 요청 출처입니다.'},
                status_code=403,
            )

    response = await call_next(request)

    # 계정 관련 응답은 브라우저 cache에 남기지 않습니다.
    if (
        request.url.path.startswith('/api/auth')
        or request.url.path.startswith('/api/me')
    ):
        response.headers['Cache-Control'] = 'no-store'

    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


# -----------------------------------------------------------------------------
# 2. 로그인/세션 공통 함수
# -----------------------------------------------------------------------------

# 로그인 쿠키 원문을 DB에 그대로 저장하지 않고 SHA-256 hash로 바꿉니다.
def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


# 로그인이 필요한 API가 공통으로 사용하는 검사 함수입니다.
def require_session(request: Request, db=Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME, '')
    session = db.get(Session, token_hash(token)) if token else None

    # 세션이 없거나 시간이 끝났으면 로그인 필요 오류를 냅니다.
    if not session or session.expires_at <= time.time():
        raise HTTPException(401, '로그인이 필요합니다.')

    # GET처럼 읽기만 하는 요청이 아니라면 CSRF 토큰도 확인합니다.
    if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
        received_csrf = request.headers.get('x-csrf-token', '')
        if not hmac.compare_digest(received_csrf, session.csrf_token):
            raise HTTPException(
                403,
                '보안 토큰이 만료되었습니다. 새로고침 후 다시 시도하세요.',
            )

    return session


# 로그인/회원가입 성공 뒤 새 세션을 만들고 브라우저 쿠키에 token을 넣습니다.
def establish_session(user, response, request, db):
    previous_token = request.cookies.get(COOKIE_NAME)

    # 같은 브라우저의 예전 세션은 지웁니다.
    if previous_token:
        db.execute(
            delete(Session).where(
                Session.token_hash == token_hash(previous_token),
            ),
        )

    # 이미 만료된 세션들도 정리합니다.
    db.execute(
        delete(Session).where(Session.expires_at <= int(time.time())),
    )

    # token은 로그인 신분증, csrf는 변경 요청을 보호하는 추가 보안값입니다.
    token = secrets.token_urlsafe(32)
    csrf_token = secrets.token_hex(32)
    one_week = 604_800

    db.add(
        Session(
            token_hash=token_hash(token),
            user_id=user.id,
            csrf_token=csrf_token,
            expires_at=int(time.time()) + one_week,
        ),
    )
    db.commit()

    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite='lax',
        max_age=one_week,
        path='/api',
    )

    return {'user': user, 'csrf_token': csrf_token}


# -----------------------------------------------------------------------------
# 3. 공고 응답/검색을 위한 작은 함수
# -----------------------------------------------------------------------------

# 공고 ID로 DB에서 한 건을 찾고, 없으면 404 오류를 냅니다.
def get_job(job_id, db):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, '공고를 찾을 수 없습니다.')
    return job


# SQLAlchemy Job 객체를 프론트가 쓰는 dict로 바꿉니다.
def job_out(job, db, companies=None):
    # 검색처럼 공고가 많을 때는 companies dict를 미리 만들어 DB 반복조회(N+1)를 줄입니다.
    company = (
        companies[job.company_id]
        if companies is not None
        else db.get(Company, job.company_id)
    )

    job_columns = {
        column.name: getattr(job, column.name)
        for column in Job.__table__.columns
    }

    return job_columns | {
        'company': company.name,
        'company_size': company.size,
    }


# 화면에서 보낼 수 있는 필터 field를 두 종류로 나눕니다.
# SCALAR_FILTERS는 Job의 한 문자열 column과 직접 비교합니다.
SCALAR_FILTERS = {
    'region',
    'category',
    'education',
    'experience',
    'employment',
    'work_mode',
    'salary_type',
    'company_type',
    'industry',
}

# LIST_FILTERS는 Job 안의 JSON 배열과 하나라도 겹치는지 검사합니다.
LIST_FILTERS = {'requirements', 'conditions', 'benefits'}

# 화면 글자와 실제 연봉 최소값(만원)을 연결합니다.
SALARY_OPTIONS = {
    '3천만원 이상': 3000,
    '4천만원 이상': 4000,
    '5천만원 이상': 5000,
    '7천만원 이상': 7000,
    '1억원 이상': 10000,
}

VALID_SORTS = {'latest', 'salary', 'size'}


# AI 검색조건 JSON을 Pydantic 규칙으로 다시 검사합니다.
def parse_ai_conditions(raw_ai):
    if not raw_ai:
        return None

    try:
        return validate_conditions(json.loads(raw_ai))
    except (ValueError, TypeError):
        raise HTTPException(
            422,
            'AI 검색 조건 형식이 올바르지 않습니다. 검색어를 다시 입력하세요.',
        )


# 일반 필터 JSON을 안전한 dict로 바꿉니다.
def parse_filters(raw_filters):
    try:
        selected = json.loads(raw_filters)
        allowed_fields = SCALAR_FILTERS | LIST_FILTERS | {'salary'}

        if not isinstance(selected, dict):
            raise ValueError()

        # 우리가 모르는 key가 하나라도 있으면 잘못된 조건으로 봅니다.
        if set(selected) - allowed_fields:
            raise ValueError()

        # 모든 필터 값은 "문자열 배열"이어야 하고 너무 크면 막습니다.
        invalid_value = any(
            not isinstance(values, list)
            or len(values) > 30
            or any(
                not isinstance(value, str) or len(value) > 80
                for value in values
            )
            for values in selected.values()
        )
        if invalid_value:
            raise ValueError()

        return selected
    except (ValueError, TypeError):
        raise HTTPException(422, '검색 조건 형식이 올바르지 않습니다.')


# 지도에서 고른 { 지역: [구, 구] } JSON을 안전하게 정리합니다.
def parse_districts(raw_districts):
    try:
        raw_selection = json.loads(raw_districts)

        if not isinstance(raw_selection, dict) or len(raw_selection) > 17:
            raise ValueError()

        district_selection = {}

        for region, value in raw_selection.items():
            if not isinstance(region, str) or len(region) > 20:
                raise ValueError()

            # 과거 단일 문자열 형식도 배열 하나로 바꿔 받아줍니다.
            values = [value] if isinstance(value, str) else value

            if (
                not isinstance(values, list)
                or len(values) > 30
                or any(
                    not isinstance(item, str) or len(item) > 40
                    for item in values
                )
            ):
                raise ValueError()

            # dict.fromkeys는 순서를 유지하면서 중복을 없애는 간단한 방법입니다.
            district_selection[region] = [
                item for item in dict.fromkeys(values) if item
            ]

        return district_selection
    except (ValueError, TypeError):
        raise HTTPException(422, '지도 지역 조건 형식이 올바르지 않습니다.')


# DB에서 바로 처리하기 좋은 필터를 SQLAlchemy statement에 붙입니다.
def apply_database_filters(statement, selected, interpreted, company_id):
    if company_id is not None:
        statement = statement.where(Job.company_id == company_id)

    # AI가 해석한 구조화 조건을 먼저 적용합니다.
    if interpreted:
        if interpreted.regions:
            statement = statement.where(Job.region.in_(interpreted.regions))

        for field in ('category', 'experience', 'work_mode'):
            value = getattr(interpreted, field)
            if value:
                statement = statement.where(getattr(Job, field) == value)

        if interpreted.salary_min is not None:
            statement = statement.where(
                Job.salary_type == '연봉',
                Job.salary_min >= interpreted.salary_min,
            )

    # 일반 필터 중 DB column과 바로 비교할 수 있는 항목을 적용합니다.
    for field in SCALAR_FILTERS:
        if selected.get(field):
            statement = statement.where(
                getattr(Job, field).in_(selected[field]),
            )

    return statement


# JSON 배열형 필터(requirements/conditions/benefits)가 맞는지 검사합니다.
def matches_list_filters(job, selected):
    return all(
        not selected.get(field)
        or set(selected[field]).intersection(getattr(job, field))
        for field in LIST_FILTERS
    )


# 급여 필터가 현재 공고와 맞는지 검사합니다.
def matches_salary_filter(job, selected):
    salary_filters = selected.get('salary')
    if not salary_filters:
        return True

    return any(
        # 회사내규는 demo 데이터에서 salary_min == 0으로 표현합니다.
        (option == '회사내규' and job.salary_min == 0)
        or (
            option in SALARY_OPTIONS
            and job.salary_type == '연봉'
            and job.salary_min >= SALARY_OPTIONS[option]
        )
        for option in salary_filters
    )


# 검색어의 모든 단어가 공고 검색용 text 안에 들어있는지 검사합니다.
def matches_keywords(job, company, words):
    searchable_text = ' '.join([
        job.title,
        company.name,
        job.region,
        job.district,
        job.description,
        *job.tags,
    ]).lower()

    return all(word in searchable_text for word in words)


# 정렬 이름을 실제 Python 정렬 key 함수로 바꿉니다.
def sort_key(sort):
    keys = {
        'latest': lambda job: (job['created_at'], -job['id']),
        'salary': lambda job: (
            job['salary_min'] if job['salary_type'] == '연봉' else -1,
            -job['id'],
        ),
        'size': lambda job: (job['company_size'], -job['id']),
    }
    return keys[sort]


# 지도에 쓸 {지역: {구: 개수}} 집계를 만듭니다.
def build_district_counts(jobs):
    counts = {}

    for job in jobs:
        region_counts = counts.setdefault(job['region'], {})
        district = job['district']
        region_counts[district] = region_counts.get(district, 0) + 1

    return counts


# -----------------------------------------------------------------------------
# 4. 서버 상태 / AI 검색 API
# -----------------------------------------------------------------------------

@app.get('/api/health')
def health(db=Depends(get_db)):
    """서버와 DB가 살아 있는지 빠르게 확인합니다."""
    db.execute(select(1))
    return {
        'status': 'ok',
        'database': engine.dialect.name,
        'ai_enabled': bool(os.getenv('OPENAI_API_KEY')),
    }


@app.post('/api/search/interpret', response_model=SearchInterpretation)
async def interpret_search(payload: SearchRequest):
    """자연어 검색문장을 제한된 AI 검색조건으로 바꿉니다."""
    query = payload.query.strip()
    if not query:
        raise HTTPException(422, '검색어를 입력하세요.')
    return await interpret(query)


# -----------------------------------------------------------------------------
# 5. 회원가입 / 로그인 / 로그아웃 API
# -----------------------------------------------------------------------------

@app.post('/api/auth/register', response_model=SessionOut, status_code=201)
def register(
    payload: Registration,
    request: Request,
    response: Response,
    db=Depends(get_db),
):
    """새 사용자를 만들고 바로 로그인 세션까지 발급합니다."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, '이름을 입력하세요.')

    user = User(
        email=str(payload.email).lower(),
        name=name,
        password_hash=password_hasher.hash(payload.password),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, '이미 등록된 이메일입니다.')

    return establish_session(user, response, request, db)


@app.post('/api/auth/login', response_model=SessionOut)
def login(
    payload: Login,
    request: Request,
    response: Response,
    db=Depends(get_db),
):
    """이메일과 비밀번호가 맞으면 로그인 세션을 발급합니다."""
    email = str(payload.email).lower()
    user = db.scalar(select(User).where(User.email == email))

    try:
        # user가 없어도 DUMMY_HASH를 검사해 응답 시간 차이를 줄입니다.
        password_hasher.verify(
            user.password_hash if user else DUMMY_HASH,
            payload.password,
        )
    except (VerifyMismatchError, InvalidHashError):
        raise HTTPException(401, '이메일 또는 비밀번호가 올바르지 않습니다.')

    if not user:
        raise HTTPException(401, '이메일 또는 비밀번호가 올바르지 않습니다.')

    return establish_session(user, response, request, db)


@app.get('/api/auth/session', response_model=SessionOut)
def current_session(request: Request, db=Depends(get_db)):
    """현재 쿠키가 유효하면 로그인 사용자와 CSRF 토큰을 돌려줍니다."""
    try:
        session = require_session(request, db)
    except HTTPException:
        return {'user': None}

    return {
        'user': db.get(User, session.user_id),
        'csrf_token': session.csrf_token,
    }


@app.post('/api/auth/logout', status_code=204)
def logout(
    response: Response,
    session=Depends(require_session),
    db=Depends(get_db),
):
    """DB 세션과 브라우저 쿠키를 함께 지웁니다."""
    db.delete(session)
    db.commit()
    response.delete_cookie(
        COOKIE_NAME,
        path='/api',
        secure=COOKIE_SECURE,
        httponly=True,
        samesite='lax',
    )


# -----------------------------------------------------------------------------
# 6. 채용공고 / 기업 API
# -----------------------------------------------------------------------------

@app.get('/api/jobs', response_model=JobPage)
def list_jobs(
    q: str = Query('', max_length=200),
    filters: str = Query('{}', max_length=6000),
    sort: str = 'latest',
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    company_id: int | None = Query(None, gt=0),
    districts: str = Query('{}', max_length=2000),
    ai: str = Query('', max_length=2000),
    db=Depends(get_db),
):
    """검색조건을 적용한 공고 한 페이지와 지도 집계를 돌려줍니다."""

    # 1) URL 문자열을 안전한 Python 데이터로 바꿉니다.
    interpreted = parse_ai_conditions(ai)
    selected = parse_filters(filters)
    district_selection = parse_districts(districts)

    if sort not in VALID_SORTS:
        raise HTTPException(422, '지원하지 않는 정렬입니다.')

    # 2) DB에서 바로 거를 수 있는 조건은 SQL 단계에서 먼저 줄입니다.
    statement = apply_database_filters(
        select(Job),
        selected,
        interpreted,
        company_id,
    )

    # 공고마다 기업을 다시 조회하지 않도록 기업표를 미리 한 번 읽습니다.
    companies = {
        company.id: company
        for company in db.scalars(select(Company))
    }
    jobs = list(db.scalars(statement))
    # 읽기가 끝나면 연결을 먼저 반환하고, 필터·지도 집계는 메모리에서 처리합니다.
    db.close()

    # AI 검색이면 AI keywords, 일반 검색이면 사용자가 입력한 공백단어를 씁니다.
    words = (
        [word.lower() for word in interpreted.keywords]
        if interpreted
        else q.lower().split()
    )

    # 3) JSON 배열/급여/키워드처럼 Python에서 확인하기 쉬운 조건을 적용합니다.
    matched_jobs = []

    for job in jobs:
        if not matches_list_filters(job, selected):
            continue

        if not matches_salary_filter(job, selected):
            continue

        company = companies[job.company_id]
        if not matches_keywords(job, company, words):
            continue

        matched_jobs.append(job_out(job, db, companies))

    # 4) 지도 집계는 특정 구 선택을 적용하기 "전" 전체 구 분포로 만듭니다.
    district_counts = build_district_counts(matched_jobs)

    # 5) 지도에서 구·군을 골랐다면 실제 공고 목록만 그 구·군으로 좁힙니다.
    visible_jobs = [
        job
        for job in matched_jobs
        if (
            not district_selection.get(job['region'])
            or job['district'] in district_selection[job['region']]
        )
    ]

    # 6) 정렬하고 현재 페이지에 필요한 조각만 잘라냅니다.
    visible_jobs.sort(key=sort_key(sort), reverse=True)

    total = len(visible_jobs)
    total_pages = (total + page_size - 1) // page_size

    # 조건 변경으로 페이지 수가 줄었을 때 없는 페이지가 되지 않게 마지막 페이지로 보정합니다.
    page = min(page, max(1, total_pages))
    start = (page - 1) * page_size
    end = start + page_size

    return {
        'items': visible_jobs[start:end],
        'page': page,
        'page_size': page_size,
        'total': total,
        'total_pages': total_pages,
        'district_counts': district_counts,
        'company_ids': sorted({job['company_id'] for job in visible_jobs}),
    }


@app.get('/api/jobs/{job_id}', response_model=JobOut)
def detail(job_id: int, db=Depends(get_db)):
    """공고 ID 하나의 상세정보를 돌려줍니다."""
    return job_out(get_job(job_id, db), db)


@app.get('/api/companies', response_model=list[CompanyOut])
def list_companies(db=Depends(get_db)):
    """모든 기업을 ID 순서대로 돌려줍니다."""
    return list(db.scalars(select(Company).order_by(Company.id)))


@app.get('/api/companies/{company_id}', response_model=CompanyOut)
def company_detail(company_id: int, db=Depends(get_db)):
    """기업 ID 하나의 정보를 돌려줍니다."""
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(404, '기업을 찾을 수 없습니다.')
    return company


# -----------------------------------------------------------------------------
# 7. MY - 저장공고 API
# -----------------------------------------------------------------------------

@app.get('/api/me/saved', response_model=list[JobOut])
def saved_jobs(
    session=Depends(require_session),
    db=Depends(get_db),
):
    """현재 사용자가 저장한 공고만 돌려줍니다."""
    statement = (
        select(Job)
        .join(SavedJob)
        .where(SavedJob.user_id == session.user_id)
        .order_by(Job.id)
    )

    return [job_out(job, db) for job in db.scalars(statement)]


@app.put('/api/me/saved/{job_id}', status_code=204)
def save_job(
    job_id: int,
    session=Depends(require_session),
    db=Depends(get_db),
):
    """저장공고 연결 한 건을 만듭니다."""
    get_job(job_id, db)

    saved_key = (session.user_id, job_id)
    if db.get(SavedJob, saved_key):
        return

    db.add(SavedJob(user_id=session.user_id, job_id=job_id))

    try:
        db.commit()
    except IntegrityError:
        # 동시에 같은 저장요청이 와도 최종 결과는 "저장됨"이면 충분합니다.
        db.rollback()


@app.delete('/api/me/saved/{job_id}', status_code=204)
def unsave_job(
    job_id: int,
    session=Depends(require_session),
    db=Depends(get_db),
):
    """저장공고 연결 한 건을 삭제합니다."""
    db.execute(
        delete(SavedJob).where(
            SavedJob.user_id == session.user_id,
            SavedJob.job_id == job_id,
        ),
    )
    db.commit()


# -----------------------------------------------------------------------------
# 8. MY - 지원현황 API
# -----------------------------------------------------------------------------

@app.get('/api/me/applications', response_model=list[ApplicationOut])
def list_applications(
    session=Depends(require_session),
    db=Depends(get_db),
):
    """기존 지원기록부터 보여줘 새로 추가한 기록이 목록 맨 아래에 오게 합니다."""
    statement = (
        select(Application)
        .where(Application.user_id == session.user_id)
        .order_by(Application.id.asc())
    )

    rows = db.scalars(statement)

    return [
        {
            'id': row.id,
            'status': row.status,
            'note': row.note,
            'job': job_out(db.get(Job, row.job_id), db),
        }
        for row in rows
    ]


@app.put('/api/me/applications/{job_id}', response_model=ApplicationOut)
def save_application(
    job_id: int,
    payload: ApplicationUpdate,
    session=Depends(require_session),
    db=Depends(get_db),
):
    """지원현황이 없으면 만들고 있으면 상태/메모를 수정합니다."""
    job = get_job(job_id, db)

    row = db.scalar(
        select(Application).where(
            Application.user_id == session.user_id,
            Application.job_id == job_id,
        ),
    )

    if row is None:
        row = Application(
            user_id=session.user_id,
            job_id=job_id,
        )
        db.add(row)

    row.status = payload.status
    row.note = payload.note

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, '동시 요청이 발생했습니다. 다시 시도하세요.')

    return {
        'id': row.id,
        'status': row.status,
        'note': row.note,
        'job': job_out(job, db),
    }


@app.delete('/api/me/applications/{job_id}', status_code=204)
def delete_application(
    job_id: int,
    session=Depends(require_session),
    db=Depends(get_db),
):
    """지원현황 한 건을 삭제해 지원 취소를 처리합니다."""
    db.execute(
        delete(Application).where(
            Application.user_id == session.user_id,
            Application.job_id == job_id,
        ),
    )
    db.commit()


# -----------------------------------------------------------------------------
# 9. MY - PDF 이력서 API
# -----------------------------------------------------------------------------

@app.get('/api/me/resume', response_model=ResumeOut | None)
def resume_info(
    session=Depends(require_session),
    db=Depends(get_db),
):
    """현재 사용자의 PDF 파일명과 크기를 돌려줍니다."""
    return db.get(Resume, session.user_id)


@app.get('/api/me/resume/file')
def resume_file(
    session=Depends(require_session),
    db=Depends(get_db),
):
    """현재 사용자의 PDF 원본 bytes를 다운로드 응답으로 돌려줍니다."""
    resume = db.get(Resume, session.user_id)
    if not resume:
        raise HTTPException(404, '등록된 이력서가 없습니다.')

    return Response(
        resume.content,
        media_type='application/pdf',
        headers={
            'Content-Disposition': (
                "attachment; filename*=UTF-8''"
                f'{quote(resume.filename)}'
            ),
        },
    )


@app.put('/api/me/resume', response_model=ResumeOut)
async def upload_resume(
    file: UploadFile = File(...),
    session=Depends(require_session),
    db=Depends(get_db),
):
    """5MB 이하의 실제 PDF인지 확인하고 사용자 이력서를 저장/교체합니다."""
    try:
        # 브라우저가 보낸 경로가 섞여도 마지막 파일명만 남깁니다.
        filename = (
            (file.filename or '')
            .replace('\\', '/')
            .rsplit('/', 1)[-1]
        )

        if (
            not filename.lower().endswith('.pdf')
            or file.content_type != 'application/pdf'
            or len(filename) > 200
        ):
            raise HTTPException(
                422,
                'PDF 파일만 업로드할 수 있습니다. 파일 이름은 200자 이내로 입력하세요.',
            )

        max_size = 5 * 1024 * 1024

        # 제한보다 1 byte 더 읽어 "너무 큼"을 정확히 구분합니다.
        content = await file.read(max_size + 1)
        if len(content) > max_size:
            raise HTTPException(413, '파일 크기는 5MB 이하여야 합니다.')

        # 확장자/MIME만 믿지 않고 PDF 시작/끝 표식도 간단히 확인합니다.
        if not content.startswith(b'%PDF-') or b'%%EOF' not in content[-1024:]:
            raise HTTPException(422, 'PDF 파일 형식을 확인해 주세요.')

        resume = db.get(Resume, session.user_id)
        if resume is None:
            resume = Resume(user_id=session.user_id)
            db.add(resume)

        resume.filename = filename
        resume.size = len(content)
        resume.content = content

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, '업로드가 겹쳤습니다. 다시 시도해 주세요.')

        return resume
    finally:
        # 성공/실패와 관계없이 임시 업로드 파일 handle은 닫습니다.
        await file.close()


@app.delete('/api/me/resume', status_code=204)
def delete_resume(
    session=Depends(require_session),
    db=Depends(get_db),
):
    """현재 사용자의 이력서를 DB에서 삭제합니다."""
    db.execute(
        delete(Resume).where(Resume.user_id == session.user_id),
    )
    db.commit()
