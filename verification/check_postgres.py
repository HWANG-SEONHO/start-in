"""현재 프로젝트 PostgreSQL 연결 및 격리된 API 회귀 검사."""
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
if not os.getenv('DATABASE_URL'):
    password = (root / '.cache/postgres.env').read_text().strip().split('=', 1)[1]
    os.environ['DATABASE_URL'] = f'postgresql+psycopg://startin:{password}@127.0.0.1:5433/startin'
os.environ['TEST_DATABASE_URL'] = os.environ['DATABASE_URL']

from backend.app.database import engine, SessionLocal
from alembic import command
from alembic.config import Config
from backend.app.seed import seed
from sqlalchemy import select, func
from backend.app.models import Job
import pytest

assert engine.dialect.name == 'postgresql'
command.upgrade(Config(str(root / 'alembic.ini')), 'head')
with SessionLocal() as db:
    seed(db)
    print('PostgreSQL connected. Jobs:', db.scalar(select(func.count()).select_from(Job)))
sys.exit(pytest.main(['backend/tests', '-q', '-p', 'no:cacheprovider', f'--basetemp={root / ".cache/pytest-postgres"}']))
