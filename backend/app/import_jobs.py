# 학습용 설명: 이 파일은 외부 JSON 채용데이터를 START IN DB로 옮기는 "이삿짐 검사원"입니다.
# 순서: JSON 읽기 → 공백 정리 → 기업 검사/저장 → 공고 검사/저장 → 결과 요약
# 잘못된 한 줄이 있어도 가능한 다른 줄은 계속 처리하고, 실패 개수와 위치를 알려줍니다.

"""로컬 JSON → 정리 → 검증 → 중복 제거 → DB 저장."""

import argparse
import hashlib
import json
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from .database import SessionLocal
from .models import Company, Job
from .schemas import JobFields


class CompanyRecord(BaseModel):
    """가져올 JSON 안의 기업 한 건이 가져야 하는 모양입니다."""

    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default='', max_length=10_000)
    size: int = Field(default=0, ge=0)


def clean(value):
    """문자열의 앞뒤 공백을 지우고, list/dict 안쪽까지 같은 작업을 반복합니다."""
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, list):
        return [clean(item) for item in value]

    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items()}

    return value


def empty_summary():
    """가져오기 결과를 셀 빈 점수판을 만듭니다."""
    return {
        'companies': {'inserted': 0, 'skipped': 0, 'failed': 0},
        'jobs': {'inserted': 0, 'skipped': 0, 'failed': 0},
        'errors': [],
    }


def validate_root(data):
    """JSON 맨 위에 companies 배열과 jobs 배열이 있는지 먼저 확인합니다."""
    valid_companies = isinstance(data, dict) and isinstance(data.get('companies'), list)
    valid_jobs = isinstance(data, dict) and isinstance(data.get('jobs'), list)

    if not valid_companies or not valid_jobs:
        raise ValueError('companies/jobs 배열을 가진 JSON이 필요합니다.')


def import_companies(db, raw_companies, summary):
    """기업을 먼저 저장하고, JSON 기업 id → 실제 DB id 번역표를 만듭니다."""
    company_ids = {}

    for index, raw_company in enumerate(raw_companies, start=1):
        try:
            row = CompanyRecord.model_validate(clean(raw_company))

            # 같은 JSON 안에서 id가 두 번 나오면 어떤 기업을 뜻하는지 모호하므로 실패시킵니다.
            if row.id in company_ids:
                raise ValueError('파일 안의 기업 ID가 중복되었습니다.')

            # begin_nested는 이 기업 한 건에서 오류가 나도 전체 작업을 바로 깨뜨리지 않게 해줍니다.
            with db.begin_nested():
                company = db.scalar(
                    select(Company).where(Company.name == row.name)
                )

                if company:
                    # 이름이 같은 기업은 같은 기업으로 보고 설명/규모는 최신 JSON 값으로 맞춥니다.
                    company.description = row.description
                    company.size = row.size
                    action = 'skipped'
                else:
                    # JSON의 id를 DB id로 억지로 쓰지 않고 DB가 새 id를 만들게 합니다.
                    company = Company(**row.model_dump(exclude={'id'}))
                    db.add(company)
                    db.flush()
                    action = 'inserted'

                # 공고의 company_id를 나중에 실제 DB id로 바꾸기 위해 기억합니다.
                company_ids[row.id] = company.id

            summary['companies'][action] += 1

        except (ValueError, ValidationError, IntegrityError):
            summary['companies']['failed'] += 1
            summary['errors'].append(
                f'companies[{index}]: 필드 또는 중복 ID를 확인하세요.'
            )

    return company_ids


def make_job_source_key(values):
    """같은 공고인지 판단할 핵심값을 SHA-256 문자열 하나로 만듭니다."""
    identity = {
        key: values[key]
        for key in ('company_id', 'title', 'region', 'district', 'created_at')
    }

    identity_json = json.dumps(
        identity,
        sort_keys=True,
        ensure_ascii=False,
    )
    source_key = hashlib.sha256(identity_json.encode()).hexdigest()
    return source_key, identity


def import_jobs(db, raw_jobs, company_ids, summary):
    """공고를 검사하고 기업과 연결한 뒤 DB를 최신 JSON 값으로 맞춥니다."""
    source_keys = set()

    for index, raw_job in enumerate(raw_jobs, start=1):
        try:
            row = JobFields.model_validate(clean(raw_job))

            # JSON 공고가 가리키는 기업이 앞 단계에서 성공적으로 준비되어 있어야 합니다.
            if row.company_id not in company_ids:
                raise ValueError('유효한 기업이 없습니다.')

            values = row.model_dump(mode='json')
            values['company_id'] = company_ids[row.company_id]

            source_key, identity = make_job_source_key(values)
            source_keys.add(source_key)

            with db.begin_nested():
                # 1순위: 이미 계산해 둔 source_key로 빠르게 같은 공고를 찾습니다.
                existing = db.scalar(
                    select(Job).where(Job.source_key == source_key)
                )

                # 예전 데이터처럼 source_key가 없을 수 있어 핵심필드 비교도 한 번 더 합니다.
                if not existing:
                    existing = db.scalar(
                        select(Job).filter_by(**identity)
                    )

                if existing:
                    # 같은 공고면 새 행을 만들지 않고 급여/설명/마감일 같은 값을 최신 JSON으로 갱신합니다.
                    for field, value in values.items():
                        setattr(existing, field, value)
                    existing.source_key = source_key
                    action = 'skipped'
                else:
                    db.add(Job(**values, source_key=source_key))
                    db.flush()
                    action = 'inserted'

            summary['jobs'][action] += 1

        except (ValueError, ValidationError, IntegrityError):
            summary['jobs']['failed'] += 1
            summary['errors'].append(
                f'jobs[{index}]: 필수 필드, 급여 범위, 날짜 또는 기업 연결을 확인하세요.'
            )

    return source_keys


def sync_demo_data(db, data):
    """배포용 데모 JSON과 DB의 데모 공고를 자동으로 같은 상태로 맞춥니다.

    기존과 같은 공고는 id를 유지해 즐겨찾기/지원 기록을 보존합니다.
    JSON에서 사라진 데모 공고만 삭제하고, 그 공고 때문에 생겼던 빈 기업도 정리합니다.
    """
    validate_root(data)
    summary = empty_summary()

    company_ids = import_companies(db, data['companies'], summary)
    desired_source_keys = import_jobs(
        db,
        data['jobs'],
        company_ids,
        summary,
    )

    # 현재 JSON에 없는 데모 공고만 찾습니다. source_key가 없는 옛 데모 공고도 정리 대상입니다.
    if desired_source_keys:
        stale_condition = or_(
            Job.source_key.is_(None),
            Job.source_key.not_in(desired_source_keys),
        )
    else:
        stale_condition = Job.source_key.is_(None)

    stale_jobs = db.scalars(
        select(Job).where(
            Job.is_demo.is_(True),
            stale_condition,
        )
    ).all()
    stale_company_ids = {job.company_id for job in stale_jobs}

    for job in stale_jobs:
        db.delete(job)

    db.flush()

    # 방금 없앤 데모 공고 외에 다른 공고가 하나도 없는 기업만 함께 정리합니다.
    deleted_companies = 0
    for company_id in stale_company_ids:
        still_used = db.scalar(
            select(Job.id).where(Job.company_id == company_id).limit(1)
        )
        if still_used is None:
            company = db.get(Company, company_id)
            if company is not None:
                db.delete(company)
                deleted_companies += 1

    db.commit()
    summary['sync'] = {
        'jobs_deleted': len(stale_jobs),
        'companies_deleted': deleted_companies,
    }
    return summary


def import_data(db, data):
    """기업 → 공고 순서로 가져온 뒤 마지막에 한 번 commit합니다."""
    validate_root(data)
    summary = empty_summary()

    company_ids = import_companies(
        db,
        data['companies'],
        summary,
    )
    import_jobs(
        db,
        data['jobs'],
        company_ids,
        summary,
    )

    db.commit()
    return summary


def read_json_file(path):
    """UTF-8 또는 BOM이 붙은 UTF-8 JSON 파일을 읽습니다."""
    file_text = path.read_text(encoding='utf-8-sig')
    return json.loads(file_text)


def main():
    """터미널에서 파일 경로를 받아 가져오기 작업을 실행합니다."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    args = parser.parse_args()

    try:
        data = read_json_file(args.file)
        with SessionLocal() as db:
            # Render가 배포 때 실행하는 공식 demo-jobs.json은 단순 추가가 아니라 자동 동기화합니다.
            # 그래서 JSON에서 없어진 예전 데모 공고가 DB에 계속 남지 않습니다.
            if args.file.name == 'demo-jobs.json' and all(
                job.get('is_demo') is True for job in data.get('jobs', [])
            ):
                summary = sync_demo_data(db, data)
            else:
                summary = import_data(db, data)
    except (OSError, ValueError) as error:
        parser.exit(1, f'가져오기 실패: {error}\n')

    print(json.dumps(summary, ensure_ascii=False, indent=2))

    # 실패가 하나라도 있으면 운영체제에 "완전 성공은 아님"을 1로 알립니다.
    has_failures = any(
        summary[kind]['failed']
        for kind in ('companies', 'jobs')
    )
    return int(has_failures)


if __name__ == '__main__':
    raise SystemExit(main())
