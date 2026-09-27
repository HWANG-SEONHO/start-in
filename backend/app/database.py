# 학습용 설명: FastAPI가 데이터베이스와 대화하려면 먼저 "연결 통로"가 필요합니다.
# 이 파일은 그 통로(engine)를 만들고, 요청마다 DB 작업용 세션(db)을 빌려줍니다.
# 읽는 순서: DATABASE_URL → engine → SessionLocal → Base → get_db

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# 1) 별도 설정이 없을 때 사용할 기본 SQLite 파일 위치입니다.
# __file__은 지금 이 Python 파일의 위치이고, parents[1]은 backend 폴더입니다.
DEFAULT_DB = Path(__file__).resolve().parents[1] / 'startin.db'

# 2) 배포 서버에서는 DATABASE_URL 환경변수로 PostgreSQL 주소를 받을 수 있습니다.
# 환경변수가 없으면 위의 SQLite 파일을 사용합니다.
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DEFAULT_DB.as_posix()}')

# 3) engine은 "Python과 DB 사이의 연결 관리자"라고 생각하면 됩니다.
# SQLite는 같은 연결을 여러 곳에서 쓸 수 있도록 check_same_thread 옵션을 꺼 줍니다.
engine_options = {}
if DATABASE_URL.startswith('sqlite'):
    engine_options['connect_args'] = {'check_same_thread': False}

engine = create_engine(DATABASE_URL, **engine_options)


# 4) SQLite는 외래키 규칙을 기본으로 강제하지 않으므로 연결될 때 직접 켭니다.
# 예: 없는 user_id를 applications에 넣는 실수를 DB가 막아주게 됩니다.
if DATABASE_URL.startswith('sqlite'):

    @event.listens_for(engine, 'connect')
    def enable_sqlite_foreign_keys(connection, _connection_record):
        connection.execute('PRAGMA foreign_keys=ON')


# 5) SessionLocal은 실제 SELECT/INSERT/UPDATE/DELETE 작업을 하는 "DB 작업상자"를 만듭니다.
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


# 6) 모든 SQLAlchemy 모델(Company, Job, User...)은 이 Base를 부모로 사용합니다.
# 그러면 SQLAlchemy가 어떤 class가 DB 테이블인지 알아볼 수 있습니다.
class Base(DeclarativeBase):
    pass


# 7) FastAPI의 Depends(get_db)가 이 함수를 사용합니다.
# 요청이 시작되면 세션을 빌려주고, 요청이 끝나면 with가 자동으로 닫아줍니다.
def get_db():
    with SessionLocal() as db:
        yield db
