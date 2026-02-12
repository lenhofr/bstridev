import { runtimeConfig } from './runtime-config';

type Tokens = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
};

const LS_TOKENS_KEY = 'bstri:auth:tokens';
const SS_PKCE_KEY = 'bstri:auth:pkce';
const SS_RETURN_TO_KEY = 'bstri:auth:returnTo';

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr);
}

async function sha256(s: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function redirectUri(): string {
  return `${window.location.origin}/admin/scoring`;
}

export function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(LS_TOKENS_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Tokens;
    if (!t.accessToken || !t.expiresAt) return null;
    if (Date.now() >= t.expiresAt - 30_000) return null;
    return t.accessToken;
  } catch {
    return null;
  }
}

export function clearTokens() {
  localStorage.removeItem(LS_TOKENS_KEY);
}

export async function startLogin(params: { returnTo?: string } = {}) {
  const domain = runtimeConfig.cognitoHostedUiDomain;
  const clientId = runtimeConfig.cognitoUserPoolClientId;
  if (!domain || !clientId) throw new Error('Missing Cognito config');

  const state = randomString(16);
  const codeVerifier = randomString(32);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

  sessionStorage.setItem(SS_PKCE_KEY, JSON.stringify({ state, codeVerifier }));
  if (params.returnTo) sessionStorage.setItem(SS_RETURN_TO_KEY, params.returnTo);

  const url = new URL(`${domain}/oauth2/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', codeChallenge);

  window.location.assign(url.toString());
}

export async function handleOAuthCallback(): Promise<{ didHandle: boolean; error?: string }> {
  const domain = runtimeConfig.cognitoHostedUiDomain;
  const clientId = runtimeConfig.cognitoUserPoolClientId;
  if (!domain || !clientId) return { didHandle: false };

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');

  if (!code && !err) return { didHandle: false };

  const pkceRaw = sessionStorage.getItem(SS_PKCE_KEY);
  sessionStorage.removeItem(SS_PKCE_KEY);

  if (err) {
    window.history.replaceState({}, '', `${url.pathname}`);
    return { didHandle: true, error: err };
  }

  if (!pkceRaw) {
    window.history.replaceState({}, '', `${url.pathname}`);
    return { didHandle: true, error: 'Missing PKCE state' };
  }

  const pkce = JSON.parse(pkceRaw) as { state: string; codeVerifier: string };
  if (!state || state !== pkce.state) {
    window.history.replaceState({}, '', `${url.pathname}`);
    return { didHandle: true, error: 'State mismatch' };
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('client_id', clientId);
  body.set('code', code);
  body.set('redirect_uri', redirectUri());
  body.set('code_verifier', pkce.codeVerifier);

  const tokenRes = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!tokenRes.ok) {
    window.history.replaceState({}, '', `${url.pathname}`);
    return { didHandle: true, error: `Token exchange failed (${tokenRes.status})` };
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const tokens: Tokens = {
    accessToken: tokenJson.access_token,
    idToken: tokenJson.id_token,
    refreshToken: tokenJson.refresh_token,
    expiresAt: Date.now() + tokenJson.expires_in * 1000
  };

  localStorage.setItem(LS_TOKENS_KEY, JSON.stringify(tokens));
  window.history.replaceState({}, '', `${url.pathname}`);

  const returnTo = sessionStorage.getItem(SS_RETURN_TO_KEY);
  if (returnTo) {
    sessionStorage.removeItem(SS_RETURN_TO_KEY);
    // Prevent open redirects: only allow returning within admin scoring.
    if (returnTo.startsWith('/admin/scoring') && returnTo !== url.pathname) {
      window.location.replace(returnTo);
    }
  }

  return { didHandle: true };
}

export function logout() {
  const domain = runtimeConfig.cognitoHostedUiDomain;
  const clientId = runtimeConfig.cognitoUserPoolClientId;
  if (!domain || !clientId) {
    clearTokens();
    return;
  }

  clearTokens();
  const url = new URL(`${domain}/logout`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('logout_uri', redirectUri());
  window.location.assign(url.toString());
}
