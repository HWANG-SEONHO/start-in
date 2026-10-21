"""웹북 파일을 GitHub에 저장한다. DB·로컬 파일·비밀값 로그를 사용하지 않는다."""
import asyncio
import base64
import hashlib
import hmac
import json
import math
import os
import re
import time
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request, Response

from .webbook_auth import patch_catalog

router = APIRouter(prefix='/webbook')
VERSION = 3
KEYS = {'first', 'type', 'color', 'layout', 'hero', 'finish'}
# 이 집합은 webbook/book/rubric.js의 RUBRIC_KEYS와 테스트로 대조한다.
STATUSES = {'approved', 'review', 'hold'}
write_lock = asyncio.Lock()
asset_cache = {}
KST = timezone(timedelta(hours=9))


def check_id(id):
    if not re.fullmatch(r'[a-z0-9-]+', id):
        raise HTTPException(400, '자산 id 형식이 올바르지 않습니다.')


def authorize(request):
    if getattr(request.state, 'webbook_session_authenticated', False):
        return
    expected = os.getenv('WEBBOOK_PASSCODE', '')
    received = request.headers.get('X-Webbook-Passcode', '')
    # UTF-8 문자열도 길이가 고정된 digest끼리 시간 일정 비교한다.
    matches = hmac.compare_digest(hashlib.sha256(expected.encode()).digest(),
                                  hashlib.sha256(received.encode()).digest())
    if not expected:
        raise HTTPException(503, '서버에 온라인 저장 암호가 설정되지 않았습니다.')
    if not matches:
        raise HTTPException(403, '저장 암호가 맞지 않습니다. 다시 저장하면 암호를 입력할 수 있습니다.')


async def body(request):
    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content) > 1024 * 1024:
            raise HTTPException(413, '요청이 너무 큽니다.')
    try:
        return json.loads(content)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, 'JSON 형식이 올바르지 않습니다.')


def js_length(value):
    return len(value.encode('utf-16-le', errors='surrogatepass')) // 2


def validate_score(data):
    valid = isinstance(data, dict) and data.get('version') == VERSION
    if valid:
        items, defects = data.get('items'), data.get('defects')
        valid = (isinstance(items, dict)
                 and all(k in KEYS and (v is None or (type(v) in (int, float)
                         and 1 <= v <= 5 and math.isfinite(v) and v == int(v))) for k, v in items.items())
                 and isinstance(defects, list)
                 and all(isinstance(v, str) and re.fullmatch(r'F0[1-4]', v) for v in defects)
                 and len(set(defects)) == len(defects)
                 and 'verdict' in data and data['verdict'] in (None, '승인', '수정', '탈락')
                 and isinstance(data.get('reference'), str) and js_length(data['reference']) <= 500
                 and isinstance(data.get('comment'), str) and js_length(data['comment']) <= 2000)
    if not valid:
        raise HTTPException(400, '점수 형식이 올바르지 않습니다. 항목은 1~5 정수 또는 null, 결함은 F01~F04 중복 없이, 판정은 승인·수정·탈락 또는 null, 레퍼런스 500자·의견 2000자 이하로 입력하세요.')


class GitHub:
    def __init__(self):
        token = os.getenv('WEBBOOK_GITHUB_TOKEN', '')
        if not token:
            raise HTTPException(503, '서버의 GitHub 토큰 설정이 필요합니다.')
        repo = os.getenv('WEBBOOK_REPO', 'HWANG-SEONHO/webbook')
        self.branch = os.getenv('WEBBOOK_BRANCH', 'main')
        self.cache_key = (repo, self.branch)
        self.client = httpx.AsyncClient(
            base_url=f'https://api.github.com/repos/{quote(repo, safe="/")}/',
            headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
                     'X-GitHub-Api-Version': '2022-11-28'}, timeout=25)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.client.aclose()

    async def request(self, method, path, **kwargs):
        try:
            response = await self.client.request(method, path, **kwargs)
        except httpx.HTTPError:
            raise HTTPException(502, 'GitHub에 연결하지 못했습니다. 잠시 후 다시 시도하세요.')
        if response.status_code in (200, 201, 404, 409):
            return response
        if response.status_code in (401, 403):
            raise HTTPException(502, 'GitHub 토큰 권한·만료 또는 API 사용 한도를 확인해 주세요.')
        raise HTTPException(502, 'GitHub 저장소 요청이 실패했습니다. 저장소·브랜치·쓰기 권한을 확인해 주세요.')

    async def read(self, path):
        response = await self.request('GET', 'contents/' + quote(path, safe='/'), params={'ref': self.branch})
        if response.status_code == 404:
            return None, None
        if response.status_code != 200:
            raise HTTPException(502, 'GitHub 파일을 읽지 못했습니다.')
        try:
            value = response.json()
            return json.loads(base64.b64decode(value['content'])), value['sha']
        except (KeyError, ValueError, TypeError):
            raise HTTPException(502, '저장소 JSON 파일을 읽을 수 없습니다.')

    async def asset_path(self, id):
        cached = asset_cache.get(self.cache_key)
        if cached and cached[0] > time.monotonic() and id in cached[1]:
            return cached[1][id]
        # 실제 assets/<group>/<sub>/<NNN>-<slug>/asset.json 트리로 찾고 파일 id도 검증한다.
        response = await self.request('GET', 'git/trees/' + quote(self.branch, safe=''), params={'recursive': '1'})
        if response.status_code != 200:
            raise HTTPException(502, 'GitHub 자산 목록을 읽지 못했습니다.')
        tree = response.json()
        if tree.get('truncated'):
            raise HTTPException(502, 'GitHub 자산 목록이 잘렸습니다. 자산 트리를 확인해 주세요.')
        paths = {}
        for row in tree.get('tree', []):
            m = re.fullmatch(r'assets/[a-z0-9-]+/([a-z0-9-]+)/(\d{3})-[a-z0-9-]+/asset\.json', row['path'])
            if m and row.get('type') == 'blob':
                key = f'{m[1]}-{m[2]}'
                if key in paths:
                    raise HTTPException(502, '저장소에 자산 id가 중복됩니다.')
                paths[key] = row['path']
        asset_cache[self.cache_key] = (time.monotonic() + 60, paths)
        if id not in paths:
            raise HTTPException(404, '자산을 찾을 수 없습니다.')
        return paths[id]

    async def asset(self, id):
        path = await self.asset_path(id)
        meta, sha = await self.read(path)
        if not isinstance(meta, dict) or meta.get('id') != id:
            raise HTTPException(404, '자산 파일의 id가 일치하지 않습니다.')
        return path, meta, sha

    async def update(self, path, message, transform):
        for attempt in range(2):
            previous, sha = await self.read(path)
            data = transform(previous)
            payload = {'message': message, 'branch': self.branch,
                       'content': base64.b64encode((json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode(errors='backslashreplace')).decode()}
            if sha:
                payload['sha'] = sha
            response = await self.request('PUT', 'contents/' + quote(path, safe='/'), json=payload)
            if response.status_code in (200, 201):
                return data
            if response.status_code != 409:
                raise HTTPException(502, 'GitHub 저장에 실패했습니다. 저장소와 브랜치를 확인해 주세요.')
        raise HTTPException(409, '다른 저장과 충돌했습니다. 다시 저장해 주세요.')


def result(data):
    return Response(json.dumps(data, ensure_ascii=True), media_type='application/json',
                    headers={'Cache-Control': 'no-store'})


@router.get('/scores/{id}')
async def get_score(id: str):
    check_id(id)
    async with GitHub() as gh:
        _, meta, _ = await gh.asset(id)
        mine, _ = await gh.read(f'scores/{id}.json')
        claude, _ = await gh.read(f'scores/claude/{id}.json')
    return result({**(mine or {}), **({'claude': claude} if claude else {}),
                   'asset': {k: meta[k] for k in ('status', 'statusNote', 'updated') if k in meta}})


@router.post('/scores/{id}')
async def post_score(id: str, request: Request):
    check_id(id)
    authorize(request)
    data = await body(request)
    validate_score(data)
    async with write_lock, GitHub() as gh:
        await gh.asset_path(id)  # 자산 존재만 확인(나무 목록 60초 캐시) — asset.json까지 읽으면 GitHub 왕복이 하나 더 는다

        def transform(previous):
            # 옛 판(v1·v2) 점수는 old 아래 보존한다.
            old = previous.get('old') if previous and previous.get('version') == VERSION else previous
            return {**{k: data[k] for k in ('version', 'items', 'defects', 'verdict', 'reference', 'comment')},
                    'updated': datetime.now(KST).strftime('%Y-%m-%d %H:%M'), **({'old': old} if isinstance(old, (dict, list)) or old else {})}

        saved = await gh.update(f'scores/{id}.json', f'채점: {id} (웹)', transform)
    patch_catalog(id, scoreData={k: saved[k] for k in ('version', 'items', 'defects') if k in saved})
    return result(saved)


@router.post('/assets/{id}/status')
async def post_status(id: str, request: Request):
    check_id(id)
    authorize(request)
    data = await body(request)
    if not isinstance(data, dict) or not isinstance(data.get('status'), str) or data['status'] not in STATUSES:
        raise HTTPException(400, '상태 값이 올바르지 않습니다.')
    async with write_lock, GitHub() as gh:
        path, _, _ = await gh.asset(id)

        def transform(meta):
            if not isinstance(meta, dict) or meta.get('id') != id:
                raise HTTPException(404, '자산을 찾을 수 없습니다.')
            meta['status'] = data['status']
            if isinstance(data.get('note'), str):
                # JS slice와 같은 UTF-16 길이 제한. 잘린 surrogate도 JSON escape로 보존한다.
                meta['statusNote'] = data['note'].encode('utf-16-le', errors='surrogatepass')[:1000].decode('utf-16-le', errors='surrogatepass')
            meta['updated'] = datetime.now(KST).strftime('%Y-%m-%d')
            return meta

        return result(await gh.update(path, f'판정: {id} → {data["status"]} (웹)', transform))
