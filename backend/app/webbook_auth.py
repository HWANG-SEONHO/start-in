"""Server-side gate for the private Webbook pages."""

import base64
import asyncio
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse

router = APIRouter()
COOKIE_NAME = 'webbook_access'
SESSION_SECONDS = 12 * 60 * 60
MAX_FAILURES = 5
FAILURE_WINDOW_SECONDS = 15 * 60
LOCK_SECONDS = 15 * 60
failures = {}
github_cache = {}
github_tree_cache = {}

LOGIN_PAGE = """<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>웹북 로그인</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f8;color:#20242c;font:16px/1.5 system-ui,'Malgun Gothic',sans-serif}
main{width:min(420px,calc(100% - 32px));padding:36px;background:#fff;border:1px solid #e2e5ea;border-radius:14px;box-shadow:0 16px 48px #20242c12}
h1{font-size:24px;margin:0 0 8px}p{margin:0 0 24px;color:#626b78}label{display:block;font-weight:600;margin-bottom:8px}input{width:100%;height:48px;padding:0 14px;border:1px solid #cbd1da;border-radius:8px;font:inherit}input:focus{outline:3px solid #315bd833;border-color:#315bd8}button{width:100%;height:48px;margin-top:16px;border:0;border-radius:8px;background:#202a3a;color:#fff;font:600 16px inherit;cursor:pointer}button:disabled{opacity:.6;cursor:wait}#message{min-height:24px;margin:12px 0 0;color:#b42318;font-size:14px}
</style><main><h1>웹북</h1><p>계속하려면 비밀번호를 입력하세요.</p><form id="login"><label for="passcode">비밀번호</label><input id="passcode" name="passcode" type="password" autocomplete="current-password" required autofocus><button>들어가기</button><p id="message" role="status" aria-live="polite"></p></form></main>
<script>
const form=document.querySelector('#login'),field=document.querySelector('#passcode'),message=document.querySelector('#message'),button=form.querySelector('button');
form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;message.textContent='';try{const r=await fetch('/b/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passcode:field.value})});const data=await r.json().catch(()=>({}));if(!r.ok){message.textContent=data.detail||'로그인할 수 없습니다.';return}field.value='';location.reload()}catch{message.textContent='연결을 확인하고 다시 시도하세요.'}finally{button.disabled=false}});
</script></html>"""


def _secret() -> str:
    return os.getenv('WEBBOOK_PASSCODE', '')


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.encode('utf-8')).digest()


def _remote_key(request: Request) -> str:
    # Render supplies X-Forwarded-For. Fall back to the direct peer in local tests.
    forwarded = request.headers.get('x-forwarded-for', '').split(',', 1)[0].strip()
    return forwarded or (request.client.host if request.client else 'unknown')


def _locked_until(key: str, now: float | None = None) -> float:
    now = time.monotonic() if now is None else now
    row = failures.get(key)
    if not row:
        return 0
    if row.get('locked_until', 0) > now:
        return row['locked_until']
    if now - row.get('first', now) >= FAILURE_WINDOW_SECONDS:
        failures.pop(key, None)
    return 0


def _record_failure(key: str, now: float | None = None) -> float:
    now = time.monotonic() if now is None else now
    row = failures.get(key)
    if not row or now - row.get('first', now) >= FAILURE_WINDOW_SECONDS:
        row = {'first': now, 'count': 0}
        failures[key] = row
    row['count'] += 1
    if row['count'] >= MAX_FAILURES:
        row['locked_until'] = now + LOCK_SECONDS
        return LOCK_SECONDS
    return 0


def _make_cookie(secret: str, now: int | None = None) -> str:
    now = int(time.time()) if now is None else now
    payload = json.dumps(
        {'sub': 'owner', 'exp': now + SESSION_SECONDS, 'nonce': secrets.token_urlsafe(12)},
        separators=(',', ':'),
    ).encode()
    encoded = base64.urlsafe_b64encode(payload).rstrip(b'=').decode()
    signature = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest()
    return encoded + '.' + base64.urlsafe_b64encode(signature).rstrip(b'=').decode()


def valid_cookie(request: Request, now: int | None = None) -> bool:
    secret = _secret()
    token = request.cookies.get(COOKIE_NAME, '')
    if not secret or not token or len(token) > 1024 or token.count('.') != 1:
        return False
    encoded, received = token.split('.', 1)
    expected = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest()
    ).rstrip(b'=').decode()
    if not hmac.compare_digest(expected, received):
        return False
    try:
        padding = '=' * (-len(encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(encoded + padding))
        current = int(time.time()) if now is None else now
        return payload.get('sub') == 'owner' and type(payload.get('exp')) is int and payload['exp'] > current
    except (ValueError, TypeError, json.JSONDecodeError):
        return False


def require_webbook_cookie(request: Request) -> None:
    if not valid_cookie(request):
        raise HTTPException(401, '웹북 로그인이 필요합니다.')


def _secure_cookie(request: Request) -> bool:
    configured = os.getenv('WEBBOOK_COOKIE_SECURE')
    if configured is not None:
        return configured.lower() == 'true'
    return request.url.hostname not in {'localhost', '127.0.0.1', 'testserver'}


def _login_page() -> HTMLResponse:
    return HTMLResponse(LOGIN_PAGE, headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.post('/b/auth/login')
async def login(request: Request):
    expected = _secret()
    if not expected:
        raise HTTPException(503, '서버에 WEBBOOK_PASSCODE가 설정되지 않았습니다.')
    key = _remote_key(request)
    locked_until = _locked_until(key)
    if locked_until:
        raise HTTPException(429, '로그인 시도가 많아 잠시 차단되었습니다. 15분 후 다시 시도하세요.', headers={'Retry-After': str(max(1, int(locked_until - time.monotonic())))})
    if request.headers.get('content-type', '').split(';', 1)[0].lower() != 'application/json':
        raise HTTPException(415, '로그인 요청 형식이 올바르지 않습니다.')
    raw = await request.body()
    if len(raw) > 2048:
        raise HTTPException(413, '로그인 요청이 너무 큽니다.')
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, '로그인 요청 형식이 올바르지 않습니다.')
    supplied = data.get('passcode', '') if isinstance(data, dict) else ''
    if not isinstance(supplied, str) or len(supplied) > 1024 or not hmac.compare_digest(_digest(expected), _digest(supplied)):
        retry = _record_failure(key)
        if retry:
            raise HTTPException(429, '로그인 시도가 많아 잠시 차단되었습니다. 15분 후 다시 시도하세요.', headers={'Retry-After': str(retry)})
        raise HTTPException(401, '비밀번호가 맞지 않습니다.')
    failures.pop(key, None)
    response = JSONResponse({'authenticated': True}, headers={'Cache-Control': 'no-store'})
    response.set_cookie(
        COOKIE_NAME, _make_cookie(expected), max_age=SESSION_SECONDS, path='/',
        httponly=True, secure=_secure_cookie(request), samesite='lax',
    )
    return response


@router.get('/b/auth/session')
def session(request: Request):
    return JSONResponse({'authenticated': valid_cookie(request)}, headers={'Cache-Control': 'no-store'})


@router.post('/b/auth/logout', status_code=204)
def logout(request: Request, response: Response):
    response.delete_cookie(COOKIE_NAME, path='/', httponly=True, secure=_secure_cookie(request), samesite='lax')


async def _local_file(relative_path: str) -> tuple[bytes, str] | None:
    configured = os.getenv('WEBBOOK_STATIC_DIR')
    if not configured:
        return None
    root = Path(configured).resolve()
    target = (root / relative_path).resolve()
    if root not in target.parents and target != root:
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    if not target.is_file():
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    suffix = target.suffix.lower()
    mime = {
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
    }.get(suffix, 'application/octet-stream')
    return target.read_bytes(), mime


def _mime(relative_path: str) -> str:
    return {
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
        '.ico': 'image/x-icon',
    }.get(Path(relative_path).suffix.lower(), 'application/octet-stream')


async def _github_tree(client: httpx.AsyncClient, repo: str, branch: str) -> dict[str, str]:
    key = (repo, branch)
    cached = github_tree_cache.get(key)
    if cached and cached[0] > time.monotonic():
        return cached[1]
    response = await client.get(f'https://api.github.com/repos/{quote(repo, safe="/")}/git/trees/{quote(branch, safe="")}', params={'recursive': '1'})
    if response.status_code != 200:
        raise HTTPException(502, '비공개 웹북 파일 목록을 읽지 못했습니다.')
    tree = response.json()
    if tree.get('truncated'):
        raise HTTPException(502, '웹북 파일 목록이 너무 커서 읽을 수 없습니다.')
    paths = {row['path']: row['sha'] for row in tree.get('tree', []) if row.get('type') == 'blob'}
    github_tree_cache[key] = (time.monotonic() + 300, paths)
    return paths


async def _github_file(relative_path: str) -> tuple[bytes, str] | None:
    token = os.getenv('WEBBOOK_GITHUB_TOKEN', '')
    repo = os.getenv('WEBBOOK_REPO', 'HWANG-SEONHO/webbook')
    branch = os.getenv('WEBBOOK_BRANCH', 'main')
    if not token:
        return None
    if relative_path == 'catalog.json':
        return await _github_catalog(token, repo, branch)
    source_path = relative_path if relative_path.startswith('assets/') else f'book/{relative_path}'
    key = (repo, branch, source_path)
    cached = github_cache.get(key)
    if cached and cached[0] > time.monotonic():
        return cached[1], _mime(relative_path)
    client = httpx.AsyncClient(timeout=30, headers={
        'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    }, limits=httpx.Limits(max_connections=20, max_keepalive_connections=10))
    try:
        tree = await _github_tree(client, repo, branch)
        sha = tree.get(source_path)
        if not sha:
            return None
        response = await client.get(f'https://api.github.com/repos/{quote(repo, safe="/")}/git/blobs/{sha}')
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            raise HTTPException(502, '비공개 웹북 파일을 가져오지 못했습니다.')
        data = response.json()
        if data.get('encoding') != 'base64' or not isinstance(data.get('content'), str):
            raise HTTPException(502, '웹북 파일 형식이 올바르지 않습니다.')
        content = base64.b64decode(data['content'])
        github_cache[key] = (time.monotonic() + 300, content)
        return content, _mime(relative_path)
    finally:
        await client.aclose()


async def _github_catalog(token: str, repo: str, branch: str) -> tuple[bytes, str]:
    key = (repo, branch, 'catalog.json')
    cached = github_cache.get(key)
    if cached and cached[0] > time.monotonic():
        return cached[1], 'application/json; charset=utf-8'
    client = httpx.AsyncClient(timeout=30, headers={
        'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    }, limits=httpx.Limits(max_connections=20, max_keepalive_connections=10))
    try:
        tree = await _github_tree(client, repo, branch)
        taxonomy_sha = tree.get('assets/taxonomy.json')
        if not taxonomy_sha:
            raise HTTPException(502, '웹북 분류 파일을 찾지 못했습니다.')

        async def blob(sha):
            response = await client.get(f'https://api.github.com/repos/{quote(repo, safe="/")}/git/blobs/{sha}')
            if response.status_code != 200:
                raise HTTPException(502, '웹북 목록을 만들기 위한 파일을 읽지 못했습니다.')
            item = response.json()
            return base64.b64decode(item['content'])

        taxonomy = json.loads(await blob(taxonomy_sha))
        rows = []
        for entry_path, sha in tree.items():
            match = re.fullmatch(r'assets/([a-z0-9-]+)/([a-z0-9-]+)/([0-9]{3}-[a-z0-9-]+)/asset\.json', entry_path)
            if match:
                rows.append((entry_path, sha, match.groups()))
        metadata = await asyncio.gather(*(blob(sha) for _, sha, _ in rows))
        group_names = {g['id']: g['name'] for g in taxonomy.get('groups', [])}
        sub_names = {s['id']: s['name'] for g in taxonomy.get('groups', []) for s in g.get('subs', [])}
        assets = []
        for (meta_path, _, (group, sub, folder)), raw in zip(rows, metadata):
            meta = json.loads(raw)
            number = folder[:3]
            if meta.get('group') != group or meta.get('sub') != sub or meta.get('id') != f'{sub}-{number}':
                continue
            folder_path = meta_path.rsplit('/', 1)[0]
            if f'{folder_path}/index.html' not in tree:
                continue
            assets.append({
                **meta, 'no': int(number), 'path': folder_path,
                'entry': f'{folder_path}/index.html',
                'subName': sub_names.get(sub, sub), 'groupName': group_names.get(group, group),
            })
        assets.sort(key=lambda item: item['id'])
        content = json.dumps({'taxonomy': taxonomy, 'assets': assets, 'problems': []}, ensure_ascii=False).encode()
        github_cache[key] = (time.monotonic() + 300, content)
        return content, 'application/json; charset=utf-8'
    finally:
        await client.aclose()


@router.get('/b')
@router.get('/b/')
async def webbook_root(request: Request):
    if not valid_cookie(request):
        return _login_page()
    return await webbook_file(request, 'index.html')


@router.get('/b/{relative_path:path}')
async def webbook_file(request: Request, relative_path: str):
    if not valid_cookie(request):
        if relative_path in {'', 'index.html'}:
            return _login_page()
        return JSONResponse({'detail': '웹북 로그인이 필요합니다.'}, status_code=401, headers={'Cache-Control': 'no-store'})
    if not relative_path or relative_path.startswith('/') or '\\' in relative_path:
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    parts = Path(relative_path).parts
    if any(part in {'..', '.'} or part.startswith('.') for part in parts):
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    item = await _local_file(relative_path)
    if item is None:
        item = await _github_file(relative_path)
    if item is None:
        raise HTTPException(503, '웹북 파일의 서버 경로가 설정되지 않았습니다.')
    content, mime = item
    if relative_path == 'index.html':
        html = content.decode('utf-8')
        if '<base ' not in html:
            html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><base href="/b/">', 1)
        html = html.replace('https://start-in-api.onrender.com/webbook', '/b-api/webbook')
        html = html.replace(
            '<script type="module" src="book.js"></script>',
            "<script>window.WEBBOOK_STATIC={base:'/b/',apiBase:'/b-api/webbook'};</script>\n<script type=\"module\" src=\"book.js\"></script>",
        )
        content = html.encode('utf-8')
    headers = {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Cookie',
        'Accept-Ranges': 'bytes',
    }
    range_header = request.headers.get('range', '')
    if range_header:
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', range_header.strip())
        if not match or (not match.group(1) and not match.group(2)):
            return Response(status_code=416, headers={**headers, 'Content-Range': f'bytes */{len(content)}'})
        if match.group(1):
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else len(content) - 1
        else:
            suffix = int(match.group(2))
            start, end = max(0, len(content) - suffix), len(content) - 1
        if start >= len(content) or end < start:
            return Response(status_code=416, headers={**headers, 'Content-Range': f'bytes */{len(content)}'})
        end = min(end, len(content) - 1)
        headers.update({'Content-Range': f'bytes {start}-{end}/{len(content)}', 'Content-Length': str(end - start + 1)})
        return Response(content[start:end + 1], status_code=206, media_type=mime, headers=headers)
    headers['Content-Length'] = str(len(content))
    return Response(content, media_type=mime, headers=headers)

