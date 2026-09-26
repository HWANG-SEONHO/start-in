"""-S로 실행: 새로 설치한 패키지와 빈 SQLite DB만 사용합니다."""
import os
import sys
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
packages = root / '.cache/fresh-python-packages'
sys.path = [str(packages), str(root)] + [path for path in sys.path if 'site-packages' not in path]
os.environ['DATABASE_URL'] = f'sqlite:///{(root / ".cache" / ("fresh-" + uuid.uuid4().hex + ".db")).as_posix()}'
os.environ.pop('OPENAI_API_KEY', None)

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.import_jobs import import_data
import json
import fastapi

assert packages in Path(fastapi.__file__).parents
command.upgrade(Config(str(root / 'alembic.ini')), 'head')
with SessionLocal() as db:
    result = import_data(db, json.loads((root / 'data/demo-jobs.json').read_text(encoding='utf-8')))
    assert result['jobs']['inserted'] == 37 and result['jobs']['failed'] == 0
with TestClient(app) as client:
    assert client.get('/api/jobs').json()['total'] == 37
    response = client.post('/api/auth/register', json={'email': 'fresh@example.com', 'name': '새 환경', 'password': 'fresh-password-123'})
    assert response.status_code == 201
    client.headers['X-CSRF-Token'] = response.json()['csrf_token']
    assert client.put('/api/me/saved/1').status_code == 204
    assert len(client.get('/api/me/saved').json()) == 1
    assert client.post('/api/search/interpret', json={'query': 'Python'}).json()['mode'] == 'keyword'
print('Fresh dependencies + empty DB migration + import + search + account/save + AI fallback: passed')
