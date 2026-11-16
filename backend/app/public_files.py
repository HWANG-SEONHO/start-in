"""로그인 없이 볼 수 있는 공개 시안 폴더(/f/). backend/public_f 안의 파일만 내보낸다."""

import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()
ROOT = (Path(__file__).resolve().parent.parent / 'public_f').resolve()


@router.get('/f')
@router.get('/f/')
@router.get('/f/{relative_path:path}')
async def public_file(relative_path: str = ''):
    target = (ROOT / relative_path).resolve()
    if ROOT != target and ROOT not in target.parents:
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    if target.is_dir():
        target = target / 'index.html'
    if not target.is_file():
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    mime = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
    return FileResponse(target, media_type=mime, headers={'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'})
