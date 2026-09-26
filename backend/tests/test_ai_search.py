import json
import httpx
from backend.app import ai_search
from backend.tests.test_api import environment

CONDITIONS = {'regions': ['부산'], 'category': 'IT·개발', 'experience': '신입', 'work_mode': None, 'salary_min': 4000, 'keywords': ['Python']}

def test_ai_request_schema_to_database_and_invalid_conditions(environment, monkeypatch):
    client, _ = environment
    monkeypatch.setenv('OPENAI_API_KEY', 'fake-test-key')
    received = []
    def model_response(request):
        received.append(json.loads(request.content))
        return httpx.Response(200, json={'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps(CONDITIONS)}]}]})
    original = httpx.AsyncClient
    monkeypatch.setattr(ai_search.httpx, 'AsyncClient', lambda **kwargs: original(**kwargs, transport=httpx.MockTransport(model_response)))
    sentence = '부산에서 신입 가능하고 연봉 4000 이상인 Python 개발직'
    result = client.post('/api/search/interpret', json={'query': sentence}).json()
    assert result['mode'] == 'ai' and result['conditions'] == CONDITIONS
    assert received[0]['input'] == sentence and received[0]['store'] is False
    assert received[0]['text']['format']['strict'] is True
    assert 'jobs' not in received[0] and 'tools' not in received[0]
    jobs = client.get('/api/jobs', params={'q': sentence, 'ai': json.dumps(result['conditions'])}).json()
    assert [job['id'] for job in jobs['items']] == [1]
    # 수동 필터는 AI 조건으로 대체하지 않고 함께 적용합니다.
    conflict = client.get('/api/jobs', params={'ai': json.dumps(CONDITIONS), 'filters': json.dumps({'region': ['서울']})}).json()
    assert conflict['total'] == 0
    for invalid in [{**CONDITIONS, 'regions': ['가짜지역']}, {**CONDITIONS, 'sql': 'DROP TABLE jobs'}, {**CONDITIONS, 'salary_min': -1}, {**CONDITIONS, 'keywords': ['x' * 41]}]:
        assert client.get('/api/jobs', params={'ai': json.dumps(invalid)}).status_code == 422

def test_ai_missing_key_errors_refusal_and_keyword_fallback(environment, monkeypatch):
    client, _ = environment
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    result = client.post('/api/search/interpret', json={'query': 'Python'}).json()
    assert result['mode'] == 'keyword' and result['conditions'] is None
    monkeypatch.setenv('OPENAI_API_KEY', 'fake-test-key')
    original = httpx.AsyncClient
    for payload, status in [({'error': 'failure'}, 503), ({'status': 'incomplete'}, 200),
                            ({'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'refusal'}]}]}, 200),
                            ({'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': '{"bad": true}'}]}]}, 200)]:
        monkeypatch.setattr(ai_search.httpx, 'AsyncClient', lambda **kwargs: original(**kwargs, transport=httpx.MockTransport(lambda request: httpx.Response(status, json=payload))))
        assert client.post('/api/search/interpret', json={'query': 'Python'}).json()['mode'] == 'keyword'
    def timeout(request):
        raise httpx.ReadTimeout('timeout', request=request)
    monkeypatch.setattr(ai_search.httpx, 'AsyncClient', lambda **kwargs: original(**kwargs, transport=httpx.MockTransport(timeout)))
    assert client.post('/api/search/interpret', json={'query': 'Python'}).json()['mode'] == 'keyword'
    assert client.get('/api/jobs', params={'q': 'Python'}).json()['total'] > 0
    assert client.post('/api/search/interpret', json={'query': ' '}).status_code == 422
