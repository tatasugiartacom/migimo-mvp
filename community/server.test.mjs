import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { handler } from './server.mjs';

test('public pages load while member content stays server protected', async () => {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/app', '/login', '/daftar']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
    }
    const home = await (await fetch(base + '/')).text();
    assert.match(home, /Connecting Dreams/);
    assert.match(home, /86 negara/);
    assert.match(home, /href="\/login">Masuk/);
    assert.match(home, /href="\/">Komunitas/);
    assert.match(home, /href="\/daftar">Daftar/);
    assert.doesNotMatch(home, /Kirim Uang di App/);
    assert.doesNotMatch(home, /CERITA YANG BERARTI|AMAN DAN JELAS|Mulai dari sebuah cerita/);
    for (const domain of ['facebook.com/migimoid', 'instagram.com/migimoid', 'threads.com/@migimoid', 'youtube.com/@MigimoID', 'x.com/migimoid']) {
      assert.ok(home.includes(domain));
    }
    assert.doesNotMatch(home, /Saat memilih cara kirim uang/);
    const login = await (await fetch(base + '/login')).text();
    assert.match(login, /Selamat datang di Migimo/);
    assert.match(login, /Lanjutkan dengan Google/);
    assert.match(login, /Masuk dengan Google sedang disiapkan/);
    const signup = await (await fetch(base + '/daftar')).text();
    assert.match(signup, /Satu langkah lagi bergabung dengan Komunitas PMI/);
    assert.match(signup, /Nama lengkap sesuai KTP/);
    assert.match(signup, /Daftar dengan Google/);
    assert.doesNotMatch(signup, /Login Google tidak memverifikasi status PMI/);
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
    const airportPhoto = await fetch(base + '/assets/pmi-airport.webp');
    assert.equal(airportPhoto.status, 200);
    assert.equal(airportPhoto.headers.get('content-type'), 'image/webp');
    for (const path of ['/community', '/community/post/1', '/api/community', '/api/community/feed']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'login_required' });
    }
  } finally {
    server.close();
  }
});
