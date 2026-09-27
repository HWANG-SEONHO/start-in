# 학습용 설명: 1000개 데모 공고 데이터의 수와 분포가 약속대로인지 자동 확인합니다.
# 큰 흐름을 먼저 읽고, 각 함수 위의 주석을 따라가면 됩니다.

"""첨부된 데모 1,000건의 가져오기 및 조회 검증."""
import json
from collections import Counter
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app import main
from backend.app.database import Base, get_db
from backend.app.import_jobs import import_data


# 이 테스트는 이름에 적힌 사용자 시나리오가 실제로 통과하는지 자동 확인합니다.
def test_demo1000_import_search_pagination_and_map(tmp_path):
    data = json.loads(Path('data/demo-jobs.json').read_text(encoding='utf-8'))
    assert len(data['companies']) == 150 and len(data['jobs']) == 1000
    assert all(job['is_demo'] for job in data['jobs'])
    engine = create_engine(f'sqlite:///{(tmp_path / "demo.db").as_posix()}', connect_args={'check_same_thread': False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    try:
        with factory() as db:
            first = import_data(db, data)
            assert first['companies'] == {'inserted': 150, 'skipped': 0, 'failed': 0}
            assert first['jobs'] == {'inserted': 1000, 'skipped': 0, 'failed': 0}
            second = import_data(db, data)
            assert second['jobs'] == {'inserted': 0, 'skipped': 1000, 'failed': 0}
        # 테스트에서 실제 설정 대신 임시 테스트용 설정을 넣기 위한 작은 함수입니다.
        def override():
            with factory() as db:
                yield db
        main.app.dependency_overrides[get_db] = override
        with TestClient(main.app) as client:
            ids = set()
            for page in range(1, 21):
                response = client.get('/api/jobs', params={'page': page, 'page_size': 50})
                assert response.status_code == 200
                result = response.json()
                assert result['total'] == 1000 and result['total_pages'] == 20
                assert len(result['items']) == 50
                ids.update(job['id'] for job in result['items'])
            assert len(ids) == 1000
            selected = {'region': ['부산']}
            result = client.get('/api/jobs', params={'filters': json.dumps(selected)}).json()
            expected = [job for job in data['jobs'] if job['region'] == '부산']
            assert result['total'] == len(expected) == 413
            assert result['district_counts']['부산'] == dict(Counter(job['district'] for job in expected))
            assert all(job['region'] == '부산' for job in result['items'])
            detail = client.get(f"/api/jobs/{result['items'][0]['id']}")
            assert detail.status_code == 200 and detail.json()['is_demo']
            assert len(client.get('/api/companies').json()) == 150
    finally:
        main.app.dependency_overrides.pop(get_db, None)
        engine.dispose()
