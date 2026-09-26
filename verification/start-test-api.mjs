import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

mkdirSync('.cache', { recursive: true });
const python = process.env.PYTHON || resolve('.runtime/python/python.exe');
const env = { ...process.env, DATABASE_URL: `sqlite:///${resolve('.cache/e2e-v4.db').replaceAll('\\', '/')}`, CORS_ORIGINS: 'http://127.0.0.1:5174', COOKIE_SECURE: 'false', OPENAI_API_KEY: '' };
const migrated = spawnSync(python, ['-m', 'alembic', 'upgrade', 'head'], { env, stdio: 'inherit' });
if (migrated.status !== 0) process.exit(migrated.status || 1);
const seeded = spawnSync(python, ['-m', 'backend.app.seed'], { env, stdio: 'inherit' });
if (seeded.status !== 0) process.exit(seeded.status || 1);
const server = spawn(python, ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8001'], { env, stdio: 'inherit' });
server.on('exit', code => process.exit(code || 0));
process.on('SIGTERM', () => server.kill());
process.on('SIGINT', () => server.kill());
