import json
from pathlib import Path
from sqlalchemy import select, text
from .database import SessionLocal
from .models import Company, Job

def seed(db):
    data = json.loads((Path(__file__).resolve().parents[2] / 'data' / 'demo-jobs.json').read_text(encoding='utf-8'))
    # 기존 데이터가 있는 DB를 예제 데이터로 덮어쓰지 않습니다.
    if db.scalar(select(Job.id).limit(1)) or db.scalar(select(Company.id).limit(1)):
        return False
    for company in data['companies']:
        db.add(Company(**company))
    db.flush()
    for job in data['jobs']:
        db.add(Job(**job))
    db.commit()
    if db.bind.dialect.name == 'postgresql':
        for table in ('companies', 'jobs'):
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), (SELECT MAX(id) FROM {table}))"))
        db.commit()
    return True

if __name__ == '__main__':
    with SessionLocal() as db:
        print('Demo data inserted.' if seed(db) else 'Database already contains data; skipped.')
