import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { GET } from '@/app/api/health/route';

const root = path.resolve(__dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');

describe('/api/health', () => {
  test('answers 200 with only ok:true, uncached', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  test('route source reads no db, env or fs', () => {
    const src = read('app/api/health/route.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/process\.env|getDb|lib\/data|node:fs/);
  });
});

describe('railway deploy files', () => {
  const cfg = JSON.parse(read('railway.json'));
  test('railway.json uses documented keys and the health path', () => {
    expect(cfg.$schema).toBe('https://railway.com/railway.schema.json');
    expect(cfg.build).toEqual({ builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' });
    expect(cfg.deploy.healthcheckPath).toBe('/api/health');
    expect(['ON_FAILURE', 'ALWAYS', 'NEVER']).toContain(cfg.deploy.restartPolicyType);
    expect(Object.keys(cfg).sort()).toEqual(['$schema', 'build', 'deploy']);
  });

  test('Dockerfile contract', () => {
    const d = read('Dockerfile');
    expect(d).toMatch(/FROM node:22/);
    expect(d).toContain('pnpm install --frozen-lockfile');
    expect(d).toMatch(/GLADOS_DATA_DIR=\/tmp\/build-data[^\n]*pnpm build/);
    expect(d).toMatch(/^USER node/m);
    expect(d).toMatch(/GLADOS_DB=\/data\/glados\.db/);
    expect(d).not.toMatch(/^VOLUME/m); // Railway rejects the VOLUME keyword
    expect(d).not.toMatch(/^ENV[^\n]*GLADOS_HOST/m); // host needs a password; set it as a service variable
    expect(d).toContain('scripts/serve.mjs');
    expect(d).toContain('GLADOS_ENV_LOCAL=/data/.env.local'); // gate reads the env file, not process.env
    expect(d).toContain('ENTRYPOINT');
  });

  test('.dockerignore keeps secrets and data out of the image', () => {
    const i = read('.dockerignore').split('\n');
    for (const e of ['.env', '.env.*', 'data', 'demo-data', 'node_modules', '.git']) expect(i).toContain(e);
    expect(existsSync(path.join(root, 'docs/deploy/railway.md'))).toBe(true);
  });
});
