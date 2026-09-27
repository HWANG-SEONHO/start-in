# 학습용 설명: Alembic이 DB 구조 변경 파일을 실제 데이터베이스에 적용하도록 연결합니다.
# 큰 흐름을 먼저 읽고, 각 함수 위의 주석을 따라가면 됩니다.

from alembic import context
from backend.app.database import engine, Base
from backend.app import models

# Alembic에게 현재 DB 연결과 SQLAlchemy 모델 메타데이터를 넘겨 migration을 실행합니다.
def run(connection):
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()

connection = context.config.attributes.get('connection')
if connection is not None:
    run(connection)
else:
    with engine.connect() as connection:
        run(connection)
