import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { handler } from './server.mjs';

test('public pages load while member content stays server protected', async () => {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/app', '/login']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
    }
    const home = await (await fetch(base + '/')).text();
    assert.match(home, /Terhubung sebagai PMI/);
    assert.doesNotMatch(home, /Saat memilih cara kirim uang/);
    const login = await (await fetch(base + '/login')).text();
    assert.match(login, /Pendaftaran belum dibuka/);
    const app = await (await fetch(base + '/app')).text();
    assert.match(app, /Tautan Migimo App sedang disiapkan/);
    const style = await fetch(base + '/style.css');
    assert.equal(style.status, 200);
    assert.equal(style.headers.get('content-type'), 'text/css; charset=utf-8');
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    const logo = await fetch(base + '/assets/migimo-logo.png');
    assert.equal(logo.status, 200);
    assert.equal(logo.headers.get('content-type'), 'image/png');
    for (const path of ['/community', '/community/post/1', '/api/community', '/api/community/feed']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'login_required' });
    }
  } finally {
    server.close();
  }
});
