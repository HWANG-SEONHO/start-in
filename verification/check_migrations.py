"""현재 DB upgrade 후, 격리 DB에서 데이터 보존과 downgrade를 검증합니다."""
import os
import uuid
import json
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text, Table, MetaData

root = Path(__file__).resolve().parents[1]
config = Config(str(root / 'alembic.ini'))
if '--postgres' in __import__('sys').argv:
    password = (root / '.cache/postgres.env').read_text().strip().split('=', 1)[1]
    os.environ['DATABASE_URL'] = f'postgresql+psycopg://startin:{password}@127.0.0.1:5433/startin'

from backend.app.database import engine
command.upgrade(config, 'head')
with engine.connect() as connection:
    print('Current DB migrated:', engine.dialect.name, connection.scalar(text('SELECT count(*) FROM jobs')))

schema = 'migration_' + uuid.uuid4().hex
if engine.dialect.name == 'postgresql':
    with engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    isolated = create_engine(engine.url, connect_args={'options': f'-csearch_path={schema}'})
else:
    isolated = create_engine(f'sqlite:///{(root / ".cache" / (schema + ".db")).as_posix()}')
try:
    with isolated.connect() as connection:
        config.attributes['connection'] = connection
        command.upgrade(config, '0001')
        connection.execute(text("INSERT INTO companies (id, name, description, size) VALUES (1, 'migration sample', '', 1)"))
        job = json.loads((root / 'data/demo-jobs.json').read_text(encoding='utf-8'))['jobs'][0]
        connection.execute(Table('jobs', MetaData(), autoload_with=connection).insert().values(**job))
        connection.commit()
        command.upgrade(config, 'head')
        assert 'source_key' in {column['name'] for column in inspect(connection).get_columns('jobs')}
        assert connection.scalar(text('SELECT count(*) FROM companies')) == 1
        assert connection.scalar(text('SELECT title FROM jobs WHERE id = 1')) == job['title']
        connection.commit()
        command.downgrade(config, '0001')
        assert 'source_key' not in {column['name'] for column in inspect(connection).get_columns('jobs')}
        assert connection.scalar(text('SELECT count(*) FROM companies')) == 1
        assert connection.scalar(text('SELECT title FROM jobs WHERE id = 1')) == job['title']
        connection.commit()
        command.upgrade(config, 'head')
        assert connection.scalar(text('SELECT count(*) FROM companies')) == 1
        connection.commit()
    print('Isolated upgrade / downgrade / re-upgrade: passed')
finally:
    isolated.dispose()
    if engine.dialect.name == 'postgresql':
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
