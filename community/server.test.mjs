import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { handler } from './server.mjs';

test('public pages load while member content stays server protected', async () => {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/app']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
    }
    for (const path of ['/community', '/community/post/1', '/api/community/feed']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'login_required' });
    }
  } finally {
    server.close();
  }
});
