"""로컬 JSON → 정리 → 검증 → 중복 제거 → DB 저장."""
import argparse
import hashlib
import json
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from .database import SessionLocal
from .models import Company, Job
from .schemas import JobFields

class CompanyRecord(BaseModel):
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default='', max_length=10000)
    size: int = Field(default=0, ge=0)

def clean(value):
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return [clean(item) for item in value]
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items()}
    return value

def import_data(db, data):
    if not isinstance(data, dict) or not isinstance(data.get('companies'), list) or not isinstance(data.get('jobs'), list):
        raise ValueError('companies/jobs 배열을 가진 JSON이 필요합니다.')
    summary = {kind: {'inserted': 0, 'skipped': 0, 'failed': 0} for kind in ('companies', 'jobs')}
    summary['errors'] = []
    company_ids = {}
    for index, raw in enumerate(data['companies'], 1):
        try:
            row = CompanyRecord.model_validate(clean(raw))
            if row.id in company_ids:
                raise ValueError('파일 안의 기업 ID가 중복되었습니다.')
            with db.begin_nested():
                company = db.scalar(select(Company).where(Company.name == row.name))
                action = 'skipped' if company else 'inserted'
                if not company:
                    company = Company(**row.model_dump(exclude={'id'}))
                    db.add(company)
                    db.flush()
                company_ids[row.id] = company.id
            summary['companies'][action] += 1
        except (ValueError, ValidationError, IntegrityError):
            summary['companies']['failed'] += 1
            summary['errors'].append(f'companies[{index}]: 필드 또는 중복 ID를 확인하세요.')
    for index, raw in enumerate(data['jobs'], 1):
        try:
            row = JobFields.model_validate(clean(raw))
            if row.company_id not in company_ids:
                raise ValueError('유효한 기업이 없습니다.')
            values = row.model_dump(mode='json')
            values['company_id'] = company_ids[row.company_id]
            # 원본 ID는 DB ID로 강제하지 않고 공고 식별 필드로 중복을 판별합니다.
            identity = {key: values[key] for key in ('company_id', 'title', 'region', 'district', 'created_at')}
            source_key = hashlib.sha256(json.dumps(identity, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            with db.begin_nested():
                existing = db.scalar(select(Job).where(Job.source_key == source_key))
                if not existing:
                    existing = db.scalar(select(Job).filter_by(**identity))
                if existing:
                    existing.source_key = source_key
                    action = 'skipped'
                else:
                    db.add(Job(**values, source_key=source_key))
                    db.flush()
                    action = 'inserted'
            summary['jobs'][action] += 1
        except (ValueError, ValidationError, IntegrityError):
            summary['jobs']['failed'] += 1
            summary['errors'].append(f'jobs[{index}]: 필수 필드, 급여 범위, 날짜 또는 기업 연결을 확인하세요.')
    db.commit()
    return summary

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.file.read_text(encoding='utf-8-sig'))
        with SessionLocal() as db:
            summary = import_data(db, data)
    except (OSError, ValueError) as error:
        parser.exit(1, f'가져오기 실패: {error}\n')
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return int(any(summary[kind]['failed'] for kind in ('companies', 'jobs')))

if __name__ == '__main__':
    raise SystemExit(main())
