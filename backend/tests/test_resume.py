from fastapi.testclient import TestClient
from sqlalchemy import select
from backend.app import main
from backend.app.models import Resume
from backend.tests.test_api import environment, register

PDF = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'

def test_resume_upload_replace_delete_validation_and_ownership(environment):
    client, factory = environment
    assert client.get('/api/me/resume/file').status_code == 401
    assert client.put('/api/me/resume', files={'file': ('resume.pdf', PDF, 'application/pdf')}).status_code == 401
    user_id = register(client).json()['user']['id']
    assert client.get('/api/me/resume').json() is None
    assert client.put('/api/me/resume', headers={'X-CSRF-Token': 'wrong'}, files={'file': ('resume.pdf', PDF, 'application/pdf')}).status_code == 403
    uploaded = client.put('/api/me/resume', files={'file': ('이력서.pdf', PDF, 'application/pdf')})
    assert uploaded.status_code == 200 and uploaded.json()['filename'] == '이력서.pdf'
    downloaded = client.get('/api/me/resume/file')
    assert downloaded.content == PDF
    assert 'attachment' in downloaded.headers['content-disposition']
    assert downloaded.headers['cache-control'] == 'no-store'
    for filename, mime, content, code in [('bad.txt', 'application/pdf', PDF, 422), ('bad.pdf', 'text/plain', PDF, 422), ('bad.pdf', 'application/pdf', b'not pdf', 422), ('large.pdf', 'application/pdf', b'%PDF-' + b'x' * (5 * 1024 * 1024), 413)]:
        assert client.put('/api/me/resume', files={'file': (filename, content, mime)}).status_code == code
        assert client.get('/api/me/resume/file').content == PDF
    with TestClient(main.app) as other:
        register(other, 'resume-other@example.com')
        assert other.get('/api/me/resume').json() is None
        assert other.get(f'/api/me/resume/file?user_id={user_id}').status_code == 404
        assert other.delete('/api/me/resume').status_code == 204
    assert client.get('/api/me/resume/file').content == PDF
    replacement = PDF.replace(b'1.4', b'1.5')
    assert client.put('/api/me/resume', files={'file': ('new.pdf', replacement, 'application/pdf')}).status_code == 200
    with factory() as db:
        row = db.scalar(select(Resume).where(Resume.user_id == user_id))
        assert row.filename == 'new.pdf' and row.content == replacement
    assert client.delete('/api/me/resume').status_code == 204
    assert client.get('/api/me/resume/file').status_code == 404
    assert client.get('/api/me/resume').json() is None
