import json
from pathlib import Path
from sqlalchemy import select, func
from backend.app.import_jobs import import_data
from backend.app.models import Company, Job
from backend.tests.test_api import environment

def test_import_cleanup_validation_duplicates_and_persistence(environment):
    _, factory = environment
    data = json.loads(Path('data/demo-jobs.json').read_text(encoding='utf-8'))
    with factory() as db:
        summary = import_data(db, data)
        assert summary['jobs'] == {'inserted': 0, 'skipped': 37, 'failed': 0}
        assert summary['companies']['skipped'] == 5
        sample = dict(data['jobs'][0], title='  새 가져오기 공고  ')
        broken = dict(sample, title=' ', salary_max=-1)
        missing_company = dict(sample, company_id=999)
        mixed = {'companies': data['companies'], 'jobs': [sample, sample, broken, missing_company]}
        result = import_data(db, mixed)
        assert result['jobs'] == {'inserted': 1, 'skipped': 1, 'failed': 2}
        assert len(result['errors']) == 2
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(Job)) == 38
        assert db.scalar(select(Job).where(Job.title == '새 가져오기 공고')).source_key
        assert db.scalar(select(func.count()).select_from(Company)) == 5
