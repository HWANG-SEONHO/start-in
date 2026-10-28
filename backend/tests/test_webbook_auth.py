import base64
import hashlib
import json

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app import webbook_auth as w


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('WEBBOOK_PASSCODE', 'test-only-passcode')
    monkeypatch.setenv('WEBBOOK_GITHUB_TOKEN', 'fake-token-never-sent')
    monkeypatch.setenv('WEBBOOK_REPO', 'owner/webbook')
    monkeypatch.setenv('WEBBOOK_BRANCH', 'school')
    monkeypatch.delenv('WEBBOOK_STATIC_DIR', raising=False)
    w.github_cache.clear()
    w.github_tree_cache.clear()
    w.failures.clear()
    files = {
        'book/index.html': (b'<meta charset="utf-8">', 'html-sha'),
        'assets/photo.webp': (b'photo-content', 'photo-sha'),
        'assets/taxonomy.json': (b'{"groups": []}', 'taxonomy-sha'),
        'assets/style/icon/004-svg-symbol-shelf/index.html': (b'<html><title>SVG shelf</title></html>', 'svg-shelf-sha'),
    }
    calls = []

    def handler(request):
        calls.append(request)
        assert request.headers['Authorization'] == 'Bearer fake-token-never-sent'
        if '/git/trees/' in request.url.path:
            assert request.url.path.endswith('/school')
            return httpx.Response(200, json={'tree': [
                {'path': path, 'sha': sha, 'type': 'blob'}
                for path, (_, sha) in files.items()
            ]})
        sha = request.url.path.split('/git/blobs/')[1]
        content = next(content for content, value in files.values() if value == sha)
        return httpx.Response(200, json={
            'sha': sha, 'encoding': 'base64',
            'content': base64.b64encode(content).decode(),
        })

    original = httpx.AsyncClient
    monkeypatch.setattr(w.httpx, 'AsyncClient', lambda **kwargs: original(
        transport=httpx.MockTransport(handler), **kwargs))
    app = FastAPI()
    app.include_router(w.router)
    with TestClient(app) as client:
        client.cookies.set(w.COOKIE_NAME, w._make_cookie('test-only-passcode'))
        yield client, files, calls
    w.github_cache.clear()
    w.github_tree_cache.clear()
    w.failures.clear()


@pytest.mark.parametrize('path,sha', [
    ('assets/photo.webp', 'photo-sha'), ('index.html', 'html-sha'),
])
def test_asset_etag(setup, path, sha):
    client, _, _ = setup
    response = client.get(f'/b/{path}')
    assert response.status_code == 200
    assert response.headers['etag'] == f'"{sha}"'
    assert response.headers['cache-control'] == 'private, no-cache'
    assert response.headers['vary'] == 'Cookie'
    if path == 'index.html':
        assert '<base href="/b/">' in response.text


@pytest.mark.parametrize('range_headers', [{}, {'Range': 'bytes=0-4'}])
def test_matching_etag_skips_blob_without_body_cache(setup, range_headers):
    client, _, calls = setup
    response = client.get('/b/assets/photo.webp', headers={
        **range_headers, 'If-None-Match': '"photo-sha"',
    })
    assert response.status_code == 304
    assert response.content == b''
    assert response.headers['etag'] == '"photo-sha"'
    assert response.headers['cache-control'] == 'private, no-cache'
    assert response.headers['vary'] == 'Cookie'
    assert len(calls) == 1 and '/git/trees/' in calls[0].url.path


def test_different_etag_returns_body(setup):
    client, _, calls = setup
    response = client.get('/b/assets/photo.webp', headers={'If-None-Match': '"old-sha"'})
    assert response.status_code == 200
    assert response.content == b'photo-content'
    assert response.headers['etag'] == '"photo-sha"'
    assert len(calls) == 2 and '/git/blobs/photo-sha' in calls[-1].url.path


def test_tree_sha_change_does_not_reuse_old_body(setup):
    client, files, calls = setup
    assert client.get('/b/assets/photo.webp').content == b'photo-content'
    files['assets/photo.webp'] = (b'new-photo', 'new-sha')
    w.github_tree_cache.clear()
    response = client.get('/b/assets/photo.webp', headers={'If-None-Match': '"photo-sha"'})
    assert response.status_code == 200
    assert response.content == b'new-photo'
    assert response.headers['etag'] == '"new-sha"'
    assert calls[-1].url.path.endswith('/git/blobs/new-sha')


def test_cached_body_keeps_etag(setup):
    client, _, calls = setup
    first = client.get('/b/assets/photo.webp')
    second = client.get('/b/assets/photo.webp')
    assert second.status_code == 200
    assert second.content == first.content
    assert second.headers['etag'] == first.headers['etag']
    assert len(calls) == 2
    response = client.get('/b/assets/photo.webp', headers={'If-None-Match': first.headers['etag']})
    assert response.status_code == 304 and response.content == b''
    assert len(calls) == 2


def test_login_required_before_conditional_request(setup):
    client, _, calls = setup
    client.cookies.clear()
    response = client.get('/b/assets/photo.webp', headers={'If-None-Match': '"photo-sha"'})
    assert response.status_code == 401
    assert response.headers['cache-control'] == 'no-store'
    assert 'etag' not in response.headers
    assert not calls


def test_range_response_has_etag(setup):
    client, _, _ = setup
    response = client.get('/b/assets/photo.webp', headers={'Range': 'bytes=0-4'})
    assert response.status_code == 206
    assert response.content == b'photo'
    assert response.headers['content-range'] == 'bytes 0-4/13'
    assert response.headers['etag'] == '"photo-sha"'
    assert response.headers['cache-control'] == 'private, no-cache'


def test_local_file_content_sha1_and_revalidation(setup, monkeypatch, tmp_path):
    client, _, calls = setup
    monkeypatch.setenv('WEBBOOK_STATIC_DIR', str(tmp_path))
    content = b'local-photo'
    (tmp_path / 'photo.png').write_bytes(content)
    etag = f'"{hashlib.sha1(content).hexdigest()}"'
    response = client.get('/b/photo.png')
    assert response.status_code == 200 and response.content == content
    assert response.headers['etag'] == etag
    assert response.headers['cache-control'] == 'private, no-cache'
    assert client.get('/b/photo.png', headers={'Range': 'bytes=0-4'}).headers['etag'] == etag
    response = client.get('/b/photo.png', headers={'If-None-Match': etag})
    assert response.status_code == 304 and response.content == b''
    (tmp_path / 'photo.png').write_bytes(b'changed')
    assert client.get('/b/photo.png', headers={'If-None-Match': etag}).status_code == 200
    assert not calls


def test_login_session_and_catalog_stay_no_store(setup):
    client, _, _ = setup
    response = client.get('/b/catalog.json', headers={'If-None-Match': '"taxonomy-sha"'})
    assert response.status_code == 200
    assert json.loads(response.content)['assets'] == []
    assert response.headers['cache-control'] == 'private, no-store'
    assert 'etag' not in response.headers
    client.cookies.clear()
    assert client.get('/b/').headers['cache-control'] == 'no-store'
    assert client.get('/b/auth/session').headers['cache-control'] == 'no-store'
    response = client.post('/b/auth/login', json={'passcode': 'test-only-passcode'})
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'


def test_same_sha_body_survives_ttl(setup):
    # 같은 sha면 5분이 지나 목록을 다시 받아도 파일 내용은 다시 받지 않는다
    client, _, calls = setup
    client.get('/b/assets/photo.webp')
    for key, value in list(w.github_cache.items()):
        if isinstance(value, tuple):
            w.github_cache[key] = (0, value[1], value[2])
    w.github_tree_cache.clear()
    response = client.get('/b/assets/photo.webp')
    assert response.content == b'photo-content'
    assert not any('/git/blobs/' in c.url.path for c in calls[2:])


def test_large_text_is_gzipped(setup):
    import gzip
    client, files, _ = setup
    body = ('<p>피움</p>' * 400).encode()
    files['assets/page.html'] = (body, 'page-sha')
    w.github_tree_cache.clear()
    response = client.get('/b/assets/page.html', headers={'Accept-Encoding': 'gzip'})
    assert response.status_code == 200
    assert response.headers['content-encoding'] == 'gzip'
    assert response.headers['vary'] == 'Cookie, Accept-Encoding'
    assert response.content == body  # 받는 쪽이 풀어서 본다
    raw = client.get('/b/assets/photo.webp', headers={'Accept-Encoding': 'gzip'})
    assert 'content-encoding' not in raw.headers


def test_svg_shortcut_serves_the_symbol_shelf(setup):
    client, _, calls = setup
    response = client.get('/b/svg')
    assert response.status_code == 200
    assert response.content == b'<html><title>SVG shelf</title></html>'
    assert response.headers['content-type'].startswith('text/html')
    assert response.headers['etag'] == '"svg-shelf-sha"'
    assert '/git/blobs/svg-shelf-sha' in calls[-1].url.path
