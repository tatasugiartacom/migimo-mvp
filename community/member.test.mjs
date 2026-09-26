import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { sign, unsign } from './auth.mjs';
import { memberHome, memberProfile, memberDiscussion } from './member-view.mjs';
import { handler } from './server.mjs';

test('signed state rejects tampering and expiry', () => {
  const previous = process.env.MIGIMO_SESSION_SECRET;
  process.env.MIGIMO_SESSION_SECRET = 'test-only-secret-with-more-than-32-characters';
  try {
    const token = sign({ memberId: '123' }, 60);
    assert.equal(unsign(token).memberId, '123');
    const [body, mac] = token.split('.');
    assert.equal(unsign(`${body}.${mac[0] === 'A' ? 'B' : 'A'}${mac.slice(1)}`), null);
    assert.equal(unsign(sign({ memberId: '123' }, -1)), null);
  } finally {
    if (previous === undefined) delete process.env.MIGIMO_SESSION_SECRET;
    else process.env.MIGIMO_SESSION_SECRET = previous;
  }
});

test('member views escape names and posts while keeping approved layout', () => {
  const member = { name: '<script>alert(1)</script>', category: null };
  const post = { id: '96061316-6a30-46b5-baf6-dad440d68f98', body: '<img src=x onerror=alert(1)>', author_name: 'Anggota <b>', author_category: 'PMI', created_at: '2026-09-26T10:00:00Z', comments: 0, reactions: 0, liked: false };
  const home = memberHome(member, [post]);
  assert.match(home, /Ruang cerita PMI/);
  assert.match(home, /Kirim Uang/);
  assert.match(home, /&lt;script&gt;/);
  assert.match(home, /&lt;img/);
  assert.doesNotMatch(home, /<script>|<img src=x/);
  assert.match(home, /action="\/api\/community\/posts"/);
  assert.match(memberProfile(member), /Purna PMI/);
  assert.match(memberDiscussion(member, post, [{ author_name: '<i>hi</i>', body: '<svg>', created_at: '2026-09-26T10:00:00Z' }]), /&lt;svg&gt;/);
});

test('unconfigured auth never opens member routes or accepts writes', async () => {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base + '/api/community/posts', { method: 'POST', body: 'body=private' });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'login_required' });
    const auth = await fetch(base + '/auth/google', { redirect: 'manual' });
    assert.equal(auth.status, 404);
  } finally { server.close(); }
});
