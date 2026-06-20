// Persisted state lived under a "wwem" (Wuthering Waves Endstate Matrix) prefix
// before the project broadened into a general toolkit and adopted the "wuwa"
// namespace. This one-time migration copies any value still under an old key to
// its new key so users keep their saved plans, then drops the old key.
export function migrateLegacy(oldKey: string, newKey: string): string | null {
  try {
    const legacy = localStorage.getItem(oldKey);
    if (legacy !== null) {
      localStorage.setItem(newKey, legacy);
      localStorage.removeItem(oldKey);
      return legacy;
    }
  } catch {
    /* ignore storage errors */
  }
  return null;
}
