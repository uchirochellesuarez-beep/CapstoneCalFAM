/**
 * Single-account session helpers for the browser.
 * - One active auth blob in localStorage (one account per browser profile)
 * - Cross-tab sync when login/logout happens
 * - Force logout when API reports SESSION_REPLACED
 */

const AUTH_CHANNEL = 'cafam-auth-session';
const SESSION_EVENT_KEY = 'cafam_session_event';

export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getTokenSessionId(token) {
  return parseJwtPayload(token)?.sid || null;
}

/**
 * If this browser already has the same account logged in, block a duplicate
 * login attempt (same account, one browser).
 */
export function isSameAccountAlreadyInBrowser(userId) {
  try {
    const raw = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    if (!raw || !token) return false;
    const user = JSON.parse(raw);
    return user && Number(user.id) === Number(userId);
  } catch {
    return false;
  }
}

export function broadcastAuthEvent(type, payload = {}) {
  const message = { type, at: Date.now(), ...payload };
  try {
    localStorage.setItem(SESSION_EVENT_KEY, JSON.stringify(message));
    localStorage.removeItem(SESSION_EVENT_KEY);
  } catch {
    /* ignore quota */
  }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(AUTH_CHANNEL);
      ch.postMessage(message);
      ch.close();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Wire tab sync + optional forced logout callback.
 * Returns an unsubscribe function.
 */
export function initAuthSessionGuard({ onRemoteLogout, onRemoteLogin } = {}) {
  const handle = (data) => {
    if (!data || !data.type) return;
    if (data.type === 'logout' || data.type === 'session_replaced') {
      onRemoteLogout?.(data);
    } else if (data.type === 'login') {
      onRemoteLogin?.(data);
    }
  };

  const onStorage = (e) => {
    if (e.key === SESSION_EVENT_KEY && e.newValue) {
      try {
        handle(JSON.parse(e.newValue));
      } catch {
        /* ignore */
      }
    }
    // Another tab wrote a new token/user — reload auth from storage
    if (e.key === 'token' || e.key === 'currentUser') {
      if (!e.newValue && e.key === 'token') {
        handle({ type: 'logout', reason: 'storage_cleared' });
      } else if (e.key === 'token' && e.newValue) {
        handle({ type: 'login', reason: 'storage_updated' });
      }
    }
  };

  window.addEventListener('storage', onStorage);

  let channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (ev) => handle(ev.data);
    }
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
  };
}

/**
 * Inspect a failed API response for session replacement.
 */
export async function detectSessionReplaced(response) {
  if (!response || response.status !== 401) return null;
  try {
    const data = await response.clone().json();
    if (data?.code === 'SESSION_REPLACED') return data;
  } catch {
    /* ignore */
  }
  return null;
}
