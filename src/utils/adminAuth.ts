import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../lib/firebase';

/**
 * Secure Admin Authentication & Cross-Device Credential Management for "Лавка Зомби"
 * Features:
 * - Login & Password validated against Firestore /admin_auth/credentials via server rules
 * - Zero secret password hashes readable by public clients
 * - Password changes apply across all devices & immediately revoke prior passwords
 * - Brute-force protection: 5 attempts max, 15-minute lockout with countdown
 */

const SALT = 'lavka_zombie_salt_2026_minsk';
const SESSION_KEY = 'zombie_admin_session';
const ATTEMPTS_KEY = 'zombie_admin_attempts';

const ALLOWED_USERNAMES = new Set([
  'zombie_boss',
  'lz_minsk',
  'nikita_zombie',
  'zombie_owner',
  'nikita',
  'gotdehgot@gmail.com',
]);

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  remainingAttempts: number;
}

export async function hashPasswordWithSalt(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(SALT + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getLockoutStatus(): LockoutStatus {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) {
      return { isLocked: false, remainingSeconds: 0, remainingAttempts: 5 };
    }
    const data = JSON.parse(raw);
    const now = Date.now();

    if (data.lockoutUntil && data.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((data.lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, remainingAttempts: 0 };
    }

    if (data.firstAttemptTime && now - data.firstAttemptTime > 10 * 60 * 1000) {
      localStorage.removeItem(ATTEMPTS_KEY);
      return { isLocked: false, remainingSeconds: 0, remainingAttempts: 5 };
    }

    const attempts = data.count || 0;
    return {
      isLocked: false,
      remainingSeconds: 0,
      remainingAttempts: Math.max(0, 5 - attempts),
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, remainingAttempts: 5 };
  }
}

export function recordFailedAttempt(): LockoutStatus {
  const now = Date.now();
  let data = { count: 0, firstAttemptTime: now, lockoutUntil: 0 };

  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (raw) {
      data = JSON.parse(raw);
    }
  } catch {}

  data.count = (data.count || 0) + 1;
  if (!data.firstAttemptTime) data.firstAttemptTime = now;

  if (data.count >= 5) {
    data.lockoutUntil = now + 15 * 60 * 1000;
  }

  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(data));
  } catch {}

  return getLockoutStatus();
}

export function resetFailedAttempts(): void {
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
  } catch {}
}

export function checkAdminSession(): boolean {
  try {
    let raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      raw = localStorage.getItem(SESSION_KEY);
    }
    if (!raw) return false;

    const session = JSON.parse(raw);
    const now = Date.now();

    if (
      session &&
      session.auth === true &&
      typeof session.adminHash === 'string' &&
      session.adminHash.length === 64 &&
      session.expiresAt > now
    ) {
      return true;
    }
    clearAdminSession();
    return false;
  } catch {
    return false;
  }
}

export function saveAdminSession(adminHash: string, rememberMe: boolean = true): void {
  const now = Date.now();
  const duration = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const session = {
    auth: true,
    adminHash,
    rememberMe,
    createdAt: now,
    expiresAt: now + duration,
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

export function getAdminHash(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.adminHash === 'string' && parsed.adminHash.length === 64) {
        return parsed.adminHash;
      }
    }
  } catch {}
  return '';
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code || '';
  const message = (err as { message?: string }).message || '';
  return code === 'permission-denied' || /permission[_-]denied/i.test(message);
}

async function verifyHashViaRestProbe(inputHash: string): Promise<'ok' | 'denied' | 'network'> {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const docName = `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/admin_auth/session`;
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents:commit?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docName,
              fields: {
                hash: { stringValue: inputHash },
              },
            },
            updateTransforms: [
              {
                fieldPath: 'ts',
                setToServerValue: 'REQUEST_TIME',
              },
            ],
          },
        ],
      }),
    });
    if (res.ok) return 'ok';
    if (res.status === 403 || res.status === 401) return 'denied';
    return 'network';
  } catch {
    return 'network';
  }
}

export async function verifyAdminCredentials(
  usernameInput: string,
  passwordInput: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const lockout = getLockoutStatus();
  if (lockout.isLocked) {
    const mins = Math.ceil(lockout.remainingSeconds / 60);
    return {
      success: false,
      error: `Вход временно заблокирован из соображений безопасности. Повторите попытку через ${mins} мин.`,
    };
  }

  const username = usernameInput.trim().toLowerCase();
  if (!username || !passwordInput) {
    return { success: false, error: 'Введите логин и пароль' };
  }

  if (!ALLOWED_USERNAMES.has(username)) {
    await new Promise((r) => setTimeout(r, 350));
    const updated = recordFailedAttempt();
    return {
      success: false,
      error: `Неверный логин или пароль. Осталось попыток: ${updated.remainingAttempts}`,
    };
  }

  const inputHash = await hashPasswordWithSalt(passwordInput);

  let verified = false;
  let denied = false;

  try {
    await setDoc(doc(db, 'admin_auth', 'session'), {
      hash: inputHash,
      ts: serverTimestamp(),
    });
    verified = true;
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      denied = true;
    } else {
      const restResult = await verifyHashViaRestProbe(inputHash);
      if (restResult === 'ok') verified = true;
      else if (restResult === 'denied') denied = true;
      else {
        return {
          success: false,
          error: 'Нет связи с облачной базой данных. Проверьте интернет и повторите попытку.',
        };
      }
    }
  }

  if (denied || !verified) {
    const updated = recordFailedAttempt();
    if (updated.isLocked) {
      return {
        success: false,
        error: 'Превышен лимит неверных попыток (5). Панель заблокирована на 15 минут.',
      };
    }
    return {
      success: false,
      error: `Неверный логин или пароль. Осталось попыток: ${updated.remainingAttempts}`,
    };
  }

  resetFailedAttempts();
  saveAdminSession(inputHash, rememberMe);
  return { success: true };
}

export async function changeAdminPassword(newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Пароль должен содержать минимум 6 символов');
  }

  const prevHash = getAdminHash();
  if (!prevHash) {
    throw new Error('Текущая сессия недействительна. Выйдите и войдите заново.');
  }

  const newHash = await hashPasswordWithSalt(newPassword);

  try {
    await updateDoc(doc(db, 'admin_auth', 'credentials'), {
      activeHashes: [newHash],
      prevHash,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      clearAdminSession();
      throw new Error('Текущая сессия устарела или пароль уже был изменён. Войдите заново.');
    }
    throw new Error('Не удалось обновить пароль в облаке. Проверьте подключение к интернету.');
  }

  let remember = true;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      remember = parsed.rememberMe !== false;
    }
  } catch {}

  saveAdminSession(newHash, remember);
  return true;
}
