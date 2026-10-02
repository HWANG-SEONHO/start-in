import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app import main
from backend.app.database import Base, get_db
from backend.app.import_jobs import import_data


def test_multi_region_returns_connections_before_processing(tmp_path, monkeypatch):
    engine = create_engine(
        f'sqlite:///{(tmp_path / "concurrent.db").as_posix()}',
        connect_args={'check_same_thread': False}, pool_size=2, max_overflow=0,
        pool_timeout=5,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as db:
        import_data(db, json.loads(Path('data/demo-jobs.json').read_text(encoding='utf-8')))

    def override():
        with factory() as db:
            yield db

    original = main.job_out

    def checked_job_out(job, db, companies=None):
        assert not db.in_transaction()
        return original(job, db, companies)

    monkeypatch.setattr(main, 'job_out', checked_job_out)
    main.app.dependency_overrides[get_db] = override
    try:
        with TestClient(main.app) as client:
            def fetch(index):
                return client.get('/api/jobs', params={
                    'filters': json.dumps({'region': ['부산' if index % 2 else '서울']}),
                    'page_size': 5,
                })
            with ThreadPoolExecutor(max_workers=17) as workers:
                responses = list(workers.map(fetch, range(34)))
            assert all(response.status_code == 200 for response in responses)
            assert engine.pool.checkedout() == 0
    finally:
        main.app.dependency_overrides.pop(get_db, None)
        engine.dispose()
