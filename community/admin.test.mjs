import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { isAdmin } from './admin-access.mjs';
import { adminDashboard, adminLogin } from './admin-view.mjs';
import { memberHome, memberDiscussion } from './member-view.mjs';
import { handler } from './server.mjs';

const id = '96061316-6a30-46b5-baf6-dad440d68f98';

test('admin requires a verified Google email bound to the signed member session', () => {
  const old = process.env.MIGIMO_ADMIN_EMAIL;
  process.env.MIGIMO_ADMIN_EMAIL = 'owner@example.com';
  try {
    const member = { id, name: 'Owner', suspended: false };
    assert.equal(isAdmin({ memberId: id, verifiedEmail: 'OWNER@example.com' }, member), true);
    assert.equal(isAdmin({ memberId: id }, member), false);
    assert.equal(isAdmin({ memberId: id, verifiedEmail: 'other@example.com' }, member), false);
    assert.equal(isAdmin({ memberId: 'other', verifiedEmail: 'owner@example.com' }, member), false);
    assert.equal(isAdmin({ memberId: id, verifiedEmail: 'owner@example.com' }, { ...member, suspended: true }), false);
  } finally {
    if (old === undefined) delete process.env.MIGIMO_ADMIN_EMAIL;
    else process.env.MIGIMO_ADMIN_EMAIL = old;
  }
});

test('admin views escape member and reported content; members can open a report form', () => {
  const member = { id, name: 'Admin <script>', suspended: false };
  const data = { overview: { members: 1, posts: 1, comments: 0, open_reports: 1, suspended: 0 },
    members: [{ id: '56061316-6a30-46b5-baf6-dad440d68f98', name: '<script>alert(1)</script>', email: 'a@example.com', created_at: new Date(), suspended: false }],
    reports: [{ id, target_id: id, target_kind: 'post', reason: '<svg onload=alert(1)>', reporter_name: 'X', target_body: 'bad', created_at: new Date() }] };
  const html = adminDashboard(member, 'anggota', data);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /action="\/api\/admin\/member"/);
  assert.match(adminDashboard(member, 'laporan', data), /&lt;svg onload=alert\(1\)&gt;/);
  const post = { id, author_id: 'other', author_name: 'Other', body: 'Test', created_at: new Date(), comments: 0, reactions: 0 };
  assert.match(memberHome(member, [post]), /action="\/api\/community\/reports"/);
  assert.match(memberDiscussion(member, post, [{ id, author_id: 'other', author_name: 'Other', body: 'Reply', created_at: new Date() }]), /value="comment"/);
});

test('unauthenticated admin actions stay closed', async () => {
  assert.doesNotMatch(adminLogin(), /<nav class="admin-nav"|action="\/auth\/logout"/);
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(base + '/admin/login');
    assert.equal(login.status, 200);
    assert.equal(login.headers.get('x-robots-tag'), 'noindex, nofollow');
    const dashboard = await fetch(base + '/admin', { redirect: 'manual' });
    assert.equal(dashboard.status, 303);
    assert.equal(dashboard.headers.get('location'), '/admin/login');
    const update = await fetch(base + '/api/admin/member', { method: 'POST' });
    assert.equal(update.status, 401);
  } finally { server.close(); }
});
