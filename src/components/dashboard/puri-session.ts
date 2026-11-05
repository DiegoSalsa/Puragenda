"use client";
export function puriSessionId() {
  const key = "puragenda_puri_session_id";
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID(); window.sessionStorage.setItem(key, value); return value;
  } catch { return crypto.randomUUID(); }
}
