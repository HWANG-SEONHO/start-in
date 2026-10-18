import base64
import json

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.app import webbook as w

ASSET = 'assets/style/palette/001-real-folder/asset.json'
INPUT = {'version': 3, 'items': {'first': 1, 'type': 4, 'hero': None},
         'defects': ['F01'], 'verdict': '수정', 'reference': '기준', 'comment': '학교 채점'}
HEADERS = {'X-Webbook-Passcode': 'test-only-passcode'}


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('WEBBOOK_GITHUB_TOKEN', 'fake-token-never-sent')
    monkeypatch.setenv('WEBBOOK_PASSCODE', 'test-only-passcode')
    monkeypatch.setenv('WEBBOOK_REPO', 'owner/webbook')
    monkeypatch.setenv('WEBBOOK_BRANCH', 'school')
    w.asset_cache.clear()
    files = {ASSET: ({'id': 'palette-001', 'status': 'review', 'name': '원본', 'other': [1]}, 'asset-sha'),
             'scores/palette-001.json': ({'design': 8, 'comment': 'v1 기록'}, 'old-sha'),
             'scores/claude/palette-001.json': ({'version': 2, 'summary': '읽기 전용'}, 'claude-sha')}
    calls, puts = [], []
    state = {'conflicts': 0, 'rate_limit': False}

    def handler(request):
        calls.append(request)
        assert request.headers['Authorization'] == 'Bearer fake-token-never-sent'
        if state['rate_limit']:
            return httpx.Response(403, json={'message': 'private error not exposed'})
        path = request.url.path
        if '/git/trees/' in path:
            assert path.endswith('/school')
            return httpx.Response(200, json={'tree': [{'path': ASSET, 'type': 'blob'}]})
        file = path.split('/contents/')[1]
        if request.method == 'GET':
            assert request.url.params['ref'] == 'school'
            if file not in files:
                return httpx.Response(404)
            data, sha = files[file]
            return httpx.Response(200, json={'sha': sha, 'content': base64.b64encode(json.dumps(data, ensure_ascii=False).encode()).decode()})
        data = json.loads(request.content)
        puts.append((file, data))
        assert data['branch'] == 'school'
        if state['conflicts']:
            state['conflicts'] -= 1
            previous = files.get(file, ({}, None))[0]
            files[file] = ({**previous, 'concurrent': '보존'}, 'retry-sha')
            return httpx.Response(409)
        assert data.get('sha') == (files[file][1] if file in files else None)
        files[file] = (json.loads(base64.b64decode(data['content'])), 'saved-sha')
        return httpx.Response(200)

    original = httpx.AsyncClient
    monkeypatch.setattr(w.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    app = FastAPI()
    app.include_router(w.router)
    with TestClient(app) as client:
        yield client, files, calls, puts, state


def test_wrong_passcode_and_id(setup):
    client, _, calls, _, _ = setup
    assert client.post('/webbook/scores/palette-001', headers={'X-Webbook-Passcode': 'wrong'}, json=INPUT).status_code == 403
    assert client.post('/webbook/assets/palette-001/status', json={'status': 'hold'}).status_code == 403
    assert client.post('/webbook/scores/INVALID', headers=HEADERS, json=INPUT).status_code == 400
    assert client.get('/webbook/scores/%EA%B0%80').status_code == 400
    assert not calls


@pytest.mark.parametrize('patch', [
    {'version': 1}, {'items': []}, {'items': {'fake': 1}}, {'items': {'first': True}},
    {'items': {'first': '4'}}, {'items': {'first': 6}}, {'items': {'first': 1.5}},
    {'items': {'first': 0}}, {'defects': ['F05']}, {'defects': ['F01', 'F01']},
    {'defects': [None]}, {'verdict': '합격'}, {'comment': 'x' * 2001},
    {'reference': '😀' * 251}, {'comment': None},
])
def test_invalid_score(setup, patch):
    client, _, calls, _, _ = setup
    assert client.post('/webbook/scores/palette-001', headers=HEADERS, json={**INPUT, **patch}).status_code == 400
    assert not calls


def test_bad_json_and_status(setup):
    client, _, calls, _, _ = setup
    for data in ('null', '[]', '{broken'):
        assert client.post('/webbook/scores/palette-001', headers=HEADERS, content=data).status_code == 400
    for data in ({'status': 'invalid'}, {'status': []}, None):
        assert client.post('/webbook/assets/palette-001/status', headers=HEADERS, content=json.dumps(data)).status_code == 400
    assert not calls


def test_read_score_claude_and_live_status(setup):
    client, files, _, puts, _ = setup
    response = client.get('/webbook/scores/palette-001')
    assert response.headers['cache-control'] == 'no-store'
    assert response.json()['claude']['summary'] == '읽기 전용'
    assert response.json()['asset']['status'] == 'review'
    assert not puts
    files.pop('scores/palette-001.json')
    files.pop('scores/claude/palette-001.json')
    assert client.get('/webbook/scores/palette-001').json() == {'asset': {'status': 'review'}}
    assert client.get('/webbook/scores/absent-001').status_code == 404


def test_save_contents_sha_v1_and_create(setup):
    client, files, _, puts, _ = setup
    for _ in range(2):
        response = client.post('/webbook/scores/palette-001', headers=HEADERS, json=INPUT)
        assert response.status_code == 200, response.text
        saved = response.json()
        assert saved['old'] == {'design': 8, 'comment': 'v1 기록'}
        assert all(saved[k] == v for k, v in INPUT.items())
        assert puts[-1][1]['message'] == '채점: palette-001 (웹)'
    assert puts[0][1]['sha'] == 'old-sha'
    files.pop('scores/palette-001.json')
    assert client.post('/webbook/scores/palette-001', headers=HEADERS, json=INPUT).status_code == 200
    assert 'sha' not in puts[-1][1]
    assert 'old' not in files['scores/palette-001.json'][0]
    assert files[ASSET][0]['name'] == '원본'


def test_status_rules_real_path_and_retry(setup):
    client, files, _, puts, state = setup
    state['conflicts'] = 1
    response = client.post('/webbook/assets/palette-001/status', headers=HEADERS, json={'status': 'hold', 'note': 'x' * 501})
    assert response.status_code == 200
    saved = response.json()
    assert saved['other'] == [1] and saved['concurrent'] == '보존'
    assert saved['statusNote'] == 'x' * 500
    assert saved['status'] == 'hold'
    assert len(saved['updated']) == 10
    assert puts[0][0] == ASSET
    assert puts[1][1]['sha'] == 'retry-sha'
    assert puts[1][1]['message'] == '판정: palette-001 → hold (웹)'
    client.post('/webbook/assets/palette-001/status', headers=HEADERS, json={'status': 'approved', 'note': 123})
    assert files[ASSET][0]['statusNote'] == 'x' * 500


def test_score_retry_once_then_409(setup):
    client, _, _, puts, state = setup
    state['conflicts'] = 1
    assert client.post('/webbook/scores/palette-001', headers=HEADERS, json=INPUT).status_code == 200
    assert len(puts) == 2 and puts[1][1]['sha'] == 'retry-sha'
    state['conflicts'] = 2
    assert client.post('/webbook/scores/palette-001', headers=HEADERS, json=INPUT).status_code == 409
    assert len(puts) == 4


def test_upstream_error_is_korean_without_token(setup):
    client, _, _, _, state = setup
    state['rate_limit'] = True
    response = client.get('/webbook/scores/palette-001')
    assert response.status_code == 502
    assert 'GitHub 토큰 권한' in response.json()['detail']
    assert 'fake-token' not in response.text and 'private error' not in response.text


def test_missing_configuration_fails_closed(setup, monkeypatch):
    client, _, calls, _, _ = setup
    monkeypatch.delenv('WEBBOOK_PASSCODE')
    assert client.post('/webbook/scores/palette-001', headers=HEADERS, json=INPUT).status_code == 503
    monkeypatch.setenv('WEBBOOK_PASSCODE', 'test-only-passcode')
    monkeypatch.delenv('WEBBOOK_GITHUB_TOKEN')
    assert client.get('/webbook/scores/palette-001').status_code == 503
    assert not calls


def test_cors_router_and_db_outage(monkeypatch):
    from backend.app import main
    from sqlalchemy.exc import OperationalError
    monkeypatch.setenv('WEBBOOK_GITHUB_TOKEN', 'fake')
    monkeypatch.setenv('WEBBOOK_PASSCODE', 'fake')
    class OfflineDB:
        def connect(self):
            raise OperationalError('offline', {}, Exception('offline'))
        def execute(self, *args):
            raise OperationalError('offline', {}, Exception('offline'))
    monkeypatch.setattr(main, 'engine', OfflineDB())
    main.app.dependency_overrides[main.get_db] = lambda: OfflineDB()
    try:
        with TestClient(main.app) as client:
            preflight = client.options('/webbook/scores/palette-001', headers={
                'Origin': 'https://s-i.onrender.com', 'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type,x-webbook-passcode'})
            assert preflight.status_code == 200
            assert preflight.headers['access-control-allow-origin'] == 'https://s-i.onrender.com'
            assert client.post('/webbook/scores/palette-001', headers={'Origin': 'https://s-i.onrender.com'}, json=INPUT).status_code == 403
            assert client.get('/api/health').json()['webbook'] == 'github'
    finally:
        main.app.dependency_overrides.clear()
