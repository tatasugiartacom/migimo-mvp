import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const seconds = () => Math.floor(Date.now() / 1000);
const random = () => randomBytes(32).toString('base64url');
const secret = () => process.env.MIGIMO_SESSION_SECRET;
const origin = () => process.env.PUBLIC_ORIGIN?.replace(/\/$/, '');

export function authReady() {
  return Boolean(process.env.DATABASE_URL && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && secret()?.length >= 32 && /^https:\/\//.test(origin() || ''));
}

export function cookieValue(req, name) {
  const raw = req.headers.cookie || '';
  const item = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item?.slice(name.length + 1);
}

export function sign(value, duration) {
  if (!secret() || secret().length < 32) throw new Error('MIGIMO_SESSION_SECRET must contain at least 32 characters');
  const body = Buffer.from(JSON.stringify({ ...value, exp: seconds() + duration })).toString('base64url');
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function unsign(token) {
  if (!token || !secret()) return null;
  const [body, mac, extra] = token.split('.');
  if (!body || !mac || extra) return null;
  const expected = createHmac('sha256', secret()).update(body).digest();
  let actual;
  try { actual = Buffer.from(mac, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, 'base64url').toString());
    return Number.isSafeInteger(value.exp) && value.exp > seconds() ? value : null;
  } catch { return null; }
}

export function setCookie(res, name, value, maxAge, extra = '') {
  const secure = origin()?.startsWith('https://') ? '; Secure' : '';
  const cookie = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}${extra}`;
  const previous = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [...(Array.isArray(previous) ? previous : [previous]), cookie]);
}

export function clearCookie(res, name) { setCookie(res, name, '', 0); }
export function redirect(res, path) { res.writeHead(303, { Location: path }); res.end(); }

export function startGoogle(req, res) {
  const state = random();
  const nonce = random();
  const verifier = random();
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  setCookie(res, 'migimo_oauth', sign({ state, nonce, verifier }, 600), 600);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for (const [key, value] of Object.entries({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin()}/auth/google/callback`,
    response_type: 'code', scope: 'openid email', state, nonce,
    code_challenge: challenge, code_challenge_method: 'S256'
  })) url.searchParams.set(key, value);
  res.writeHead(302, { Location: url.toString() }); res.end();
}

export async function finishGoogle(req, res, url) {
  const flow = unsign(cookieValue(req, 'migimo_oauth'));
  clearCookie(res, 'migimo_oauth');
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!flow || !state || !code || state !== flow.state || url.searchParams.has('error')) {
    redirect(res, '/login?error=google'); return null;
  }
  const body = new URLSearchParams({
    code, client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${origin()}/auth/google/callback`,
    code_verifier: flow.verifier, grant_type: 'authorization_code'
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) { redirect(res, '/login?error=google'); return null; }
  const tokens = await response.json();
  const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID,
    algorithms: ['RS256'], clockTolerance: 5
  });
  if (payload.nonce !== flow.nonce || payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.email) {
    redirect(res, '/login?error=google'); return null;
  }
  return { sub: payload.sub, email: payload.email };
}

export function validOrigin(req) {
  const expected = origin();
  return Boolean(expected && req.headers.origin === expected);
}

export async function readBody(req, limit = 4096) {
  let input = '';
  for await (const chunk of req) {
    input += chunk;
    if (input.length > limit) throw new Error('request_too_large');
  }
  return new URLSearchParams(input);
}
