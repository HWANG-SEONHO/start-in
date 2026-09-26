import json
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
from backend.app import main
from backend.app.database import Base, get_db
from backend.app.models import User, Session, SavedJob, Application
from backend.app.seed import seed

@pytest.fixture
def environment(tmp_path, monkeypatch):
    postgres_url = os.getenv('TEST_DATABASE_URL')
    if postgres_url:
        assert postgres_url.startswith('postgresql'), 'TEST_DATABASE_URL must point to PostgreSQL'
        schema = 'test_' + uuid.uuid4().hex
        admin = create_engine(postgres_url)
        with admin.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA {schema}'))
        engine = create_engine(postgres_url, connect_args={'options': f'-csearch_path={schema}'})
    else:
        engine = create_engine(f'sqlite:///{(tmp_path / "test.db").as_posix()}', connect_args={'check_same_thread': False})
        @event.listens_for(engine, 'connect')
        def enable_fk(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as db:
        seed(db)
    def override():
        with factory() as db:
            yield db
    main.app.dependency_overrides[get_db] = override
    monkeypatch.setattr(main, 'engine', engine)
    with TestClient(main.app) as client:
        yield client, factory
    main.app.dependency_overrides.clear()
    engine.dispose()
    if postgres_url:
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        admin.dispose()

def register(client, email='alice@example.com'):
    response = client.post('/api/auth/register', json={'email': email, 'name': '테스트 사용자', 'password': 'correct-password-123'})
    assert response.status_code == 201, response.text
    client.headers['X-CSRF-Token'] = response.json()['csrf_token']
    return response

def test_search_detail_and_filters(environment):
    client, _ = environment
    assert client.get('/api/health').json()['status'] == 'ok'
    all_jobs = client.get('/api/jobs').json()
    assert all_jobs['total'] == 37
    assert len(all_jobs['items']) == 10
    selected = {'region': ['부산', '서울'], 'category': ['IT·개발']}
    jobs = client.get('/api/jobs', params={'filters': json.dumps(selected)}).json()['items']
    assert len(jobs) == 6
    assert {j['region'] for j in jobs} == {'부산', '서울'}
    assert all(j['category'] == 'IT·개발' for j in jobs)
    salary = client.get('/api/jobs', params={'filters': json.dumps({'region': ['부산'], 'salary': ['7천만원 이상']})}).json()['items']
    assert [j['id'] for j in salary] == [5]
    jobs = client.get('/api/jobs', params={'filters': json.dumps({'benefits': ['재택근무'], 'work_mode': ['하이브리드']})}).json()['items']
    assert jobs and all('재택근무' in j['benefits'] and j['work_mode'] == '하이브리드' for j in jobs)
    assert client.get('/api/jobs', params={'q': 'not-existing-keyword'}).json()['items'] == []
    assert client.get('/api/jobs/1').json()['company'] == '네이버'
    assert client.get('/api/jobs/99999').status_code == 404
    ordered = client.get('/api/jobs', params={'sort': 'salary'}).json()['items']
    assert [j['salary_min'] for j in ordered] == sorted([j['salary_min'] for j in ordered], reverse=True)

@pytest.mark.parametrize('filters', ['null', '[]', '{bad', '{"oops":[]}', '{"region":"부산"}', '{"region":[1]}'])
def test_invalid_filters(environment, filters):
    assert environment[0].get('/api/jobs', params={'filters': filters}).status_code == 422

def test_registration_session_csrf_logout(environment):
    client, factory = environment
    response = register(client)
    cookie = response.headers['set-cookie'].lower()
    assert 'httponly' in cookie and 'samesite=lax' in cookie and 'path=/api' in cookie
    assert 'password' not in response.json()['user']
    with factory() as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith('$argon2id$')
        assert user.password_hash != 'correct-password-123'
        assert db.scalar(select(Session)).token_hash != client.cookies.get('startin_session')
    assert client.get('/api/auth/session').json()['user']['email'] == 'alice@example.com'
    assert client.put('/api/me/saved/1', headers={'X-CSRF-Token': 'wrong'}).status_code == 403
    assert client.put('/api/me/saved/1', headers={'Origin': 'https://untrusted.example'}).status_code == 403
    assert client.put('/api/me/saved/1').status_code == 204
    assert client.post('/api/auth/logout').status_code == 204
    assert client.get('/api/auth/session').json()['user'] is None
    assert client.get('/api/me/saved').status_code == 401
    assert client.post('/api/auth/login', json={'email': 'alice@example.com', 'password': 'wrong'}).status_code == 401
    login = client.post('/api/auth/login', json={'email': 'ALICE@example.com', 'password': 'correct-password-123'})
    assert login.status_code == 200
    assert [job['id'] for job in client.get('/api/me/saved').json()] == [1]

def test_account_isolation_crud_and_persistence(environment):
    client, factory = environment
    register(client)
    for _ in range(2):
        assert client.put('/api/me/saved/1').status_code == 204
    assert len(client.get('/api/me/saved').json()) == 1
    assert client.put('/api/me/applications/1', json={'status': '준비중', 'note': '포트폴리오 준비'}).status_code == 200
    assert client.put('/api/me/applications/1', json={'status': '면접', 'note': '일정 확정'}).status_code == 200
    with factory() as db:
        assert len(list(db.scalars(select(SavedJob)))) == 1
        assert db.scalar(select(Application)).status == '면접'
    alice_cookie = client.cookies.get('startin_session')
    alice_csrf = client.headers['X-CSRF-Token']
    # 다른 브라우저 세션에서 가입한 사용자는 Alice의 데이터를 볼 수 없습니다.
    with TestClient(main.app) as other:
        register(other, 'bob@example.com')
        assert other.get('/api/me/saved').json() == []
        assert other.get('/api/me/applications').json() == []
        assert other.delete('/api/me/saved/1').status_code == 204
        assert other.delete('/api/me/applications/1').status_code == 204
    assert client.cookies.get('startin_session') == alice_cookie
    assert client.headers['X-CSRF-Token'] == alice_csrf
    assert len(client.get('/api/me/saved').json()) == 1
    assert client.get('/api/me/applications').json()[0]['note'] == '일정 확정'
    assert client.delete('/api/me/saved/1').status_code == 204
    assert client.delete('/api/me/applications/1').status_code == 204
    with factory() as db:
        assert db.scalar(select(SavedJob)) is None
        assert db.scalar(select(Application)) is None

def test_validation_security_and_companies(environment):
    client, _ = environment
    assert len(client.get('/api/companies').json()) == 5
    assert client.get('/api/companies/1').json()['name'] == '네이버'
    assert client.get('/api/companies/999').status_code == 404
    assert client.post('/api/auth/register', json={'email': 'bad', 'name': 'a', 'password': 'x'}).status_code == 422
    register(client)
    assert client.post('/api/auth/register', json={'email': 'alice@example.com', 'name': 'b', 'password': 'correct-password-123'}).status_code == 409
    assert client.put('/api/me/applications/1', json={'status': 'unknown'}).status_code == 422
    assert client.put('/api/me/saved/999').status_code == 404
    assert client.options('/api/jobs', headers={'Origin': 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'GET'}).headers['access-control-allow-origin'] == 'http://127.0.0.1:5173'

def test_expired_session(environment):
    client, factory = environment
    register(client)
    with factory() as db:
        db.scalar(select(Session)).expires_at = 0
        db.commit()
    assert client.get('/api/me/saved').status_code == 401

def test_pagination_company_and_map_counts(environment):
    client, _ = environment
    pages = [client.get('/api/jobs', params={'page': page, 'page_size': 10, 'sort': 'salary'}).json() for page in range(1, 5)]
    assert [len(page['items']) for page in pages] == [10, 10, 10, 7]
    assert all(page['total'] == 37 and page['total_pages'] == 4 for page in pages)
    jobs = [job for page in pages for job in page['items']]
    assert len({job['id'] for job in jobs}) == 37
    assert [job['salary_min'] for job in jobs] == sorted([job['salary_min'] for job in jobs], reverse=True)
    assert pages[0]['district_counts'] == pages[-1]['district_counts']
    company = client.get('/api/jobs', params={'company_id': 1, 'page': 2}).json()
    assert company['total'] == 17 and len(company['items']) == 7
    assert all(job['company_id'] == 1 for job in company['items'])
    assert client.get('/api/jobs', params={'company_id': 999}).json()['total'] == 0
    bounded = client.get('/api/jobs', params={'page': 999}).json()
    assert bounded['page'] == 4 and len(bounded['items']) == 7
    empty = client.get('/api/jobs', params={'q': '없는검색어', 'page': 99}).json()
    assert empty['page'] == 1 and empty['total_pages'] == 0 and empty['items'] == []
    district = client.get('/api/jobs', params={'filters': json.dumps({'region': ['부산']}), 'districts': json.dumps({'부산': '해운대구'}), 'page_size': 1}).json()
    assert district['total'] == 1 and district['items'][0]['district'] == '해운대구'
    assert sum(district['district_counts']['부산'].values()) == 5
    for params in [{'page': 0}, {'page': -1}, {'page': 'bad'}, {'page_size': 0}, {'page_size': 51}, {'company_id': 0}, {'districts': '[]'}, {'districts': '{"부산":1}'}]:
        assert client.get('/api/jobs', params=params).status_code == 422
