/**
 * Secure Admin Authentication & Protection for "Лавка Зомби"
 * Features:
 * - Login & Password (no Google OAuth / domain restrictions)
 * - Salted SHA-256 password hashing via Web Crypto API
 * - Brute-force protection: 5 attempts max, 15-minute lockout with countdown
 * - Session storage with expiration
 * - Customizable admin password
 */

const SALT = 'lavka_zombie_salt_2026_minsk';
const SESSION_KEY = 'zombie_admin_session';
const ATTEMPTS_KEY = 'zombie_admin_attempts';
const CUSTOM_HASH_KEY = 'zombie_custom_admin_hash';

// Pre-computed salted SHA-256 hashes for standard allowed passwords
// salt: 'lavka_zombie_salt_2026_minsk'
const VALID_HASHES = new Set([
  '8ab76e6a141adfab35933668bed37f41d5ee92f987b290419dd6fc2d6ef91982', // Zombie2026#Vault!Minsk
  '743d00001bc18c1046ee0bcead7a087395e93f9d1b9225dc01f89301b38fd5cd', // LZ#90s_Vintage!Minsk
  'e148fc42899e6ef2cda9be040d6c2a633ab61ffabb3fb1da0f786bcf3b556b39', // ZombieMinsk2026!
]);

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

    // Reset if window has passed (> 10 mins since first attempt)
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
    data.lockoutUntil = now + 15 * 60 * 1000; // 15 mins lock
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
    // Check sessionStorage first
    let raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      // Check localStorage for "remember me"
      raw = localStorage.getItem(SESSION_KEY);
    }
    if (!raw) return false;

    const session = JSON.parse(raw);
    const now = Date.now();

    // Max session duration: 7 days
    if (session && session.auth === true && session.expiresAt > now) {
      return true;
    }
    clearAdminSession();
    return false;
  } catch {
    return false;
  }
}

export function saveAdminSession(adminHash?: string, rememberMe: boolean = true): void {
  const now = Date.now();
  // 7 days if rememberMe, otherwise 12 hours
  const duration = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const session = {
    auth: true,
    adminHash: adminHash || 'e148fc42899e6ef2cda9be040d6c2a633ab61ffabb3fb1da0f786bcf3b556b39',
    createdAt: now,
    expiresAt: now + duration,
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {}
}

export function getAdminHash(): string {
  try {
    let raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.adminHash) return parsed.adminHash;
    }
  } catch {}
  return 'e148fc42899e6ef2cda9be040d6c2a633ab61ffabb3fb1da0f786bcf3b556b39';
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {}
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

  // Check username
  if (!ALLOWED_USERNAMES.has(username)) {
    const updated = recordFailedAttempt();
    return {
      success: false,
      error: `Неверный логин или пароль. Осталось попыток: ${updated.remainingAttempts}`,
    };
  }

  // Artificial anti-timing attack delay
  await new Promise((r) => setTimeout(r, 400));

  const inputHash = await hashPasswordWithSalt(passwordInput);

  // Check custom password if set
  const customHash = localStorage.getItem(CUSTOM_HASH_KEY);
  const isValid = (customHash && customHash === inputHash) || VALID_HASHES.has(inputHash);

  if (!isValid) {
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

  // Success
  resetFailedAttempts();
  saveAdminSession(inputHash, rememberMe);
  return { success: true };
}

export async function changeAdminPassword(newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Пароль должен содержать минимум 6 символов');
  }
  const hash = await hashPasswordWithSalt(newPassword);
  localStorage.setItem(CUSTOM_HASH_KEY, hash);
  return true;
}
