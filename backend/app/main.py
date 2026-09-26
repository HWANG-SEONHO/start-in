import hashlib
import hmac
import json
import os
import secrets
import time
from contextlib import asynccontextmanager
from urllib.parse import quote

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import FastAPI, Depends, HTTPException, Request, Response, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from .database import engine, get_db
from .models import Company, Job, User, Session, SavedJob, Application, Resume
from .schemas import Registration, Login, JobOut, JobPage, CompanyOut, SessionOut, ApplicationUpdate, ApplicationOut, ResumeOut
from .ai_search import SearchRequest, SearchInterpretation, interpret, validate_conditions

ORIGINS = os.getenv('CORS_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173').split(',')
COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
COOKIE_NAME = 'startin_session'
password_hasher = PasswordHasher()
DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(20))

@asynccontextmanager
async def lifespan(_):
    with engine.connect() as connection:
        connection.execute(select(1))
    yield

app = FastAPI(title='STARTIN API', version='0.1.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allow_headers=['Content-Type', 'X-CSRF-Token'])

@app.middleware('http')
async def protect_origin(request: Request, call_next):
    from fastapi.responses import JSONResponse
    if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
        origin = request.headers.get('origin')
        if origin and origin not in ORIGINS:
            return JSONResponse({'detail': '허용되지 않은 요청 출처입니다.'}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith('/api/auth') or request.url.path.startswith('/api/me'):
        response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def require_session(request: Request, db=Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME, '')
    session = db.get(Session, token_hash(token)) if token else None
    if not session or session.expires_at <= time.time():
        raise HTTPException(401, '로그인이 필요합니다.')
    if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
        if not hmac.compare_digest(request.headers.get('x-csrf-token', ''), session.csrf_token):
            raise HTTPException(403, '보안 토큰이 만료되었습니다. 새로고침 후 다시 시도하세요.')
    return session

def establish_session(user, response, request, db):
    previous = request.cookies.get(COOKIE_NAME)
    if previous:
        db.execute(delete(Session).where(Session.token_hash == token_hash(previous)))
    db.execute(delete(Session).where(Session.expires_at <= int(time.time())))
    token, csrf = secrets.token_urlsafe(32), secrets.token_hex(32)
    db.add(Session(token_hash=token_hash(token), user_id=user.id, csrf_token=csrf, expires_at=int(time.time()) + 604800))
    db.commit()
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=COOKIE_SECURE, samesite='lax', max_age=604800, path='/api')
    return {'user': user, 'csrf_token': csrf}

def get_job(job_id, db):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, '공고를 찾을 수 없습니다.')
    return job

def job_out(job, db, companies=None):
    company = companies[job.company_id] if companies is not None else db.get(Company, job.company_id)
    return {column.name: getattr(job, column.name) for column in Job.__table__.columns} | {'company': company.name, 'company_size': company.size}

@app.get('/api/health')
def health(db=Depends(get_db)):
    db.execute(select(1))
    return {'status': 'ok', 'database': engine.dialect.name, 'ai_enabled': bool(os.getenv('OPENAI_API_KEY'))}

@app.post('/api/search/interpret', response_model=SearchInterpretation)
async def interpret_search(payload: SearchRequest):
    if not payload.query.strip():
        raise HTTPException(422, '검색어를 입력하세요.')
    return await interpret(payload.query.strip())

@app.post('/api/auth/register', response_model=SessionOut, status_code=201)
def register(payload: Registration, request: Request, response: Response, db=Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, '이름을 입력하세요.')
    user = User(email=str(payload.email).lower(), name=name, password_hash=password_hasher.hash(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, '이미 등록된 이메일입니다.')
    return establish_session(user, response, request, db)

@app.post('/api/auth/login', response_model=SessionOut)
def login(payload: Login, request: Request, response: Response, db=Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    try:
        password_hasher.verify(user.password_hash if user else DUMMY_HASH, payload.password)
    except (VerifyMismatchError, InvalidHashError):
        raise HTTPException(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
    if not user:
        raise HTTPException(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
    return establish_session(user, response, request, db)

@app.get('/api/auth/session', response_model=SessionOut)
def current_session(request: Request, db=Depends(get_db)):
    try:
        session = require_session(request, db)
    except HTTPException:
        return {'user': None}
    return {'user': db.get(User, session.user_id), 'csrf_token': session.csrf_token}

@app.post('/api/auth/logout', status_code=204)
def logout(response: Response, session=Depends(require_session), db=Depends(get_db)):
    db.delete(session)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path='/api', secure=COOKIE_SECURE, httponly=True, samesite='lax')

SCALAR_FILTERS = {'region', 'category', 'education', 'experience', 'employment', 'work_mode', 'salary_type', 'company_type', 'industry'}
LIST_FILTERS = {'requirements', 'conditions', 'benefits'}
SALARY_OPTIONS = {'3천만원 이상': 3000, '4천만원 이상': 4000, '5천만원 이상': 5000, '7천만원 이상': 7000, '1억원 이상': 10000}

@app.get('/api/jobs', response_model=JobPage)
def list_jobs(q: str = Query('', max_length=200), filters: str = Query('{}', max_length=6000),
              sort: str = 'latest', page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50),
              company_id: int | None = Query(None, gt=0), districts: str = Query('{}', max_length=2000),
              ai: str = Query('', max_length=2000), db=Depends(get_db)):
    try:
        interpreted = validate_conditions(json.loads(ai)) if ai else None
    except (ValueError, TypeError):
        raise HTTPException(422, 'AI 검색 조건 형식이 올바르지 않습니다. 검색어를 다시 입력하세요.')
    try:
        selected = json.loads(filters)
        if not isinstance(selected, dict) or set(selected) - (SCALAR_FILTERS | LIST_FILTERS | {'salary'}):
            raise ValueError()
        if any(not isinstance(values, list) or len(values) > 30 or any(not isinstance(v, str) or len(v) > 80 for v in values) for values in selected.values()):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(422, '검색 조건 형식이 올바르지 않습니다.')
    try:
        district_selection = json.loads(districts)
        if not isinstance(district_selection, dict) or len(district_selection) > 17 or any(
            len(region) > 20 or not isinstance(value, str) or len(value) > 40
            for region, value in district_selection.items()
        ):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(422, '지도 지역 조건 형식이 올바르지 않습니다.')
    if sort not in {'latest', 'salary', 'size'}:
        raise HTTPException(422, '지원하지 않는 정렬입니다.')
    statement = select(Job)
    if company_id is not None:
        statement = statement.where(Job.company_id == company_id)
    if interpreted:
        if interpreted.regions:
            statement = statement.where(Job.region.in_(interpreted.regions))
        for field in ('category', 'experience', 'work_mode'):
            value = getattr(interpreted, field)
            if value:
                statement = statement.where(getattr(Job, field) == value)
        if interpreted.salary_min is not None:
            statement = statement.where(Job.salary_type == '연봉', Job.salary_min >= interpreted.salary_min)
    for field in SCALAR_FILTERS:
        if selected.get(field):
            statement = statement.where(getattr(Job, field).in_(selected[field]))
    companies = {company.id: company for company in db.scalars(select(Company))}
    result = []
    for job in db.scalars(statement):
        if any(selected.get(field) and not set(selected[field]).intersection(getattr(job, field)) for field in LIST_FILTERS):
            continue
        if selected.get('salary'):
            if not any((option == '회사내규' and job.salary_min == 0) or (option in SALARY_OPTIONS and job.salary_type == '연봉' and job.salary_min >= SALARY_OPTIONS[option]) for option in selected['salary']):
                continue
        text = ' '.join([job.title, companies[job.company_id].name, job.region, job.district, job.description, *job.tags]).lower()
        words = [word.lower() for word in interpreted.keywords] if interpreted else q.lower().split()
        if not all(word in text for word in words):
            continue
        result.append(job_out(job, db, companies))
    key = {'latest': lambda j: (j['created_at'], -j['id']), 'salary': lambda j: (j['salary_min'] if j['salary_type'] == '연봉' else -1, -j['id']), 'size': lambda j: (j['company_size'], -j['id'])}[sort]
    # 지도 집계는 페이지와 지도 선택에 영향받지 않아 다른 지역으로 이동할 수 있습니다.
    counts = {}
    for job in result:
        region_counts = counts.setdefault(job['region'], {})
        region_counts[job['district']] = region_counts.get(job['district'], 0) + 1
    result = [job for job in result if not district_selection.get(job['region']) or job['district'] == district_selection[job['region']]]
    result.sort(key=key, reverse=True)
    total = len(result)
    total_pages = (total + page_size - 1) // page_size
    # 유효하지만 범위를 벗어난 페이지는 마지막 페이지로 보정합니다.
    page = min(page, max(1, total_pages))
    start = (page - 1) * page_size
    return {'items': result[start:start + page_size], 'page': page, 'page_size': page_size,
            'total': total, 'total_pages': total_pages, 'district_counts': counts,
            'company_ids': sorted({job['company_id'] for job in result})}

@app.get('/api/jobs/{job_id}', response_model=JobOut)
def detail(job_id: int, db=Depends(get_db)):
    return job_out(get_job(job_id, db), db)

@app.get('/api/companies', response_model=list[CompanyOut])
def list_companies(db=Depends(get_db)):
    return list(db.scalars(select(Company).order_by(Company.id)))

@app.get('/api/companies/{company_id}', response_model=CompanyOut)
def company_detail(company_id: int, db=Depends(get_db)):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(404, '기업을 찾을 수 없습니다.')
    return company

@app.get('/api/me/saved', response_model=list[JobOut])
def saved_jobs(session=Depends(require_session), db=Depends(get_db)):
    return [job_out(job, db) for job in db.scalars(select(Job).join(SavedJob).where(SavedJob.user_id == session.user_id).order_by(Job.id))]

@app.put('/api/me/saved/{job_id}', status_code=204)
def save_job(job_id: int, session=Depends(require_session), db=Depends(get_db)):
    get_job(job_id, db)
    if not db.get(SavedJob, (session.user_id, job_id)):
        db.add(SavedJob(user_id=session.user_id, job_id=job_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

@app.delete('/api/me/saved/{job_id}', status_code=204)
def unsave_job(job_id: int, session=Depends(require_session), db=Depends(get_db)):
    db.execute(delete(SavedJob).where(SavedJob.user_id == session.user_id, SavedJob.job_id == job_id))
    db.commit()

@app.get('/api/me/applications', response_model=list[ApplicationOut])
def list_applications(session=Depends(require_session), db=Depends(get_db)):
    return [{'id': row.id, 'status': row.status, 'note': row.note, 'job': job_out(db.get(Job, row.job_id), db)} for row in db.scalars(select(Application).where(Application.user_id == session.user_id).order_by(Application.id.desc()))]

@app.put('/api/me/applications/{job_id}', response_model=ApplicationOut)
def save_application(job_id: int, payload: ApplicationUpdate, session=Depends(require_session), db=Depends(get_db)):
    job = get_job(job_id, db)
    row = db.scalar(select(Application).where(Application.user_id == session.user_id, Application.job_id == job_id))
    if row is None:
        row = Application(user_id=session.user_id, job_id=job_id)
        db.add(row)
    row.status, row.note = payload.status, payload.note
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, '동시 요청이 발생했습니다. 다시 시도하세요.')
    return {'id': row.id, 'status': row.status, 'note': row.note, 'job': job_out(job, db)}

@app.delete('/api/me/applications/{job_id}', status_code=204)
def delete_application(job_id: int, session=Depends(require_session), db=Depends(get_db)):
    db.execute(delete(Application).where(Application.user_id == session.user_id, Application.job_id == job_id))
    db.commit()

@app.get('/api/me/resume', response_model=ResumeOut | None)
def resume_info(session=Depends(require_session), db=Depends(get_db)):
    return db.get(Resume, session.user_id)

@app.get('/api/me/resume/file')
def resume_file(session=Depends(require_session), db=Depends(get_db)):
    resume = db.get(Resume, session.user_id)
    if not resume:
        raise HTTPException(404, '등록된 이력서가 없습니다.')
    return Response(resume.content, media_type='application/pdf',
                    headers={'Content-Disposition': f"attachment; filename*=UTF-8''{quote(resume.filename)}"})

@app.put('/api/me/resume', response_model=ResumeOut)
async def upload_resume(file: UploadFile = File(...), session=Depends(require_session), db=Depends(get_db)):
    try:
        filename = (file.filename or '').replace('\\', '/').rsplit('/', 1)[-1]
        if not filename.lower().endswith('.pdf') or file.content_type != 'application/pdf' or len(filename) > 200:
            raise HTTPException(422, 'PDF 파일만 업로드할 수 있습니다. 파일 이름은 200자 이내로 입력하세요.')
        content = await file.read(5 * 1024 * 1024 + 1)
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(413, '파일 크기는 5MB 이하여야 합니다.')
        if not content.startswith(b'%PDF-') or b'%%EOF' not in content[-1024:]:
            raise HTTPException(422, 'PDF 파일 형식을 확인해 주세요.')
        resume = db.get(Resume, session.user_id)
        if resume is None:
            resume = Resume(user_id=session.user_id)
            db.add(resume)
        resume.filename, resume.size, resume.content = filename, len(content), content
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, '업로드가 겹쳤습니다. 다시 시도해 주세요.')
        return resume
    finally:
        await file.close()

@app.delete('/api/me/resume', status_code=204)
def delete_resume(session=Depends(require_session), db=Depends(get_db)):
    db.execute(delete(Resume).where(Resume.user_id == session.user_id))
    db.commit()
