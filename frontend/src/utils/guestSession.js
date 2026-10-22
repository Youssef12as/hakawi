const KEY = 'hakawi.guestSession';

export function readGuestSession() {
  try {
    const guest = JSON.parse(localStorage.getItem(KEY));
    if (guest?.access_token && guest?.id && guest.expires_at > Date.now()) return guest;
  } catch { /* Ignore damaged browser storage. */ }
  localStorage.removeItem(KEY);
  return null;
}

export function saveGuestSession(guest) {
  localStorage.setItem(KEY, JSON.stringify(guest));
}

export function clearGuestSession() {
  localStorage.removeItem(KEY);
}

export async function revokeGuestSession() {
  const guest = readGuestSession();
  clearGuestSession();
  if (guest) {
    try {
      await fetch('/api/guest/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${guest.access_token}` },
      });
    } catch { /* Server expiry remains the fallback if offline. */ }
  }
}
