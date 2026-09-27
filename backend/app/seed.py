# 학습용 설명: seed는 "처음 연습할 데이터를 DB에 넣는 일"입니다.
# 이 파일은 DB가 완전히 비어 있을 때만 demo-jobs.json을 한 번 넣습니다.

import json
from pathlib import Path

from sqlalchemy import select, text

from .database import SessionLocal
from .models import Company, Job


# demo-jobs.json의 위치를 한 곳에서 계산해 두면 아래 코드가 더 읽기 쉽습니다.
DEMO_DATA_FILE = Path(__file__).resolve().parents[2] / 'data' / 'demo-jobs.json'


def load_demo_data():
    """JSON 파일을 읽어서 Python dict로 바꿉니다."""
    text_data = DEMO_DATA_FILE.read_text(encoding='utf-8')
    return json.loads(text_data)


def database_has_data(db):
    """기업이나 공고가 하나라도 있으면 이미 사용 중인 DB라고 판단합니다."""
    has_job = db.scalar(select(Job.id).limit(1)) is not None
    has_company = db.scalar(select(Company.id).limit(1)) is not None
    return has_job or has_company


def reset_postgres_sequences(db):
    """PostgreSQL의 다음 자동 id가 현재 최대 id 뒤에서 시작하도록 맞춥니다."""
    if db.bind.dialect.name != 'postgresql':
        return

    # demo JSON은 id를 직접 넣기 때문에 PostgreSQL의 자동 번호표도 뒤로 맞춰줘야 합니다.
    for table in ('companies', 'jobs'):
        db.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"(SELECT MAX(id) FROM {table}))"
            )
        )
    db.commit()


def seed(db):
    """빈 DB에 기업 → 공고 순서로 예제 데이터를 넣습니다."""
    # 기존 데이터가 있으면 절대 덮어쓰지 않습니다.
    if database_has_data(db):
        return False

    data = load_demo_data()

    # Job은 company_id를 사용하므로 기업을 먼저 저장해야 합니다.
    for company_data in data['companies']:
        db.add(Company(**company_data))
    db.flush()

    # 기업 id가 준비된 뒤 공고를 저장합니다.
    for job_data in data['jobs']:
        db.add(Job(**job_data))

    db.commit()
    reset_postgres_sequences(db)
    return True


# `python -m backend.app.seed`처럼 직접 실행했을 때만 아래 부분이 실행됩니다.
if __name__ == '__main__':
    with SessionLocal() as db:
        inserted = seed(db)
        print('Demo data inserted.' if inserted else 'Database already contains data; skipped.')
