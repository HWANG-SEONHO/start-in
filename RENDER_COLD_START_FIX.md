# START IN — Render cold start fix

## 문제
현재 Render API 서비스의 Start Command에 demo JSON 동기화가 포함되면, free instance가 다시 깨어날 때마다 기업/공고 데이터를 다시 검사한 뒤 서버가 시작됩니다.

기존 형태:

```bash
python -m alembic upgrade head && python -m backend.app.import_jobs data/demo-jobs.json && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

## 운영용 Start Command
반복 demo import를 제거하고 migration 후 바로 API를 시작합니다.

```bash
python -m alembic upgrade head && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

이 변경은 기존 DB 데이터를 삭제하지 않습니다.

## demo JSON을 실제로 바꾼 경우만 수동 동기화

```bash
python -m backend.app.import_jobs data/demo-jobs.json
```

그 뒤 평소 Start Command는 다시 `alembic upgrade head -> uvicorn`만 사용합니다.

## 중요
Render Dashboard의 Start Command는 배포 환경 설정이므로 ZIP 파일 안의 코드만 바꿔서는 기존 Render 서비스 설정이 자동 변경되지 않습니다.
