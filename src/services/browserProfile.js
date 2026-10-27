const PROFILE_KEY = "football-browser-profile-v1";
const LEGACY_KEYS = ["football-picks-v1", "football-pick-teams-v1"];
export const PROFILE_EVENT = "football-profile-changed";

export function ensureBrowserProfile() {
  let profile;
  try {
    profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    /* A damaged profile does not identify a browser. */
  }
  if (
    !profile ||
    typeof profile.id !== "string" ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(profile.id)
  ) {
    const id =
      globalThis.crypto.randomUUID?.() ||
      Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
    profile = { id, createdAt: new Date().toISOString() };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  // Copy existing data once. Leave the original entries as a recovery backup.
  const migrationKey = `football:${profile.id}:legacy-migrated`;
  if (!localStorage.getItem(migrationKey)) {
    for (const key of LEGACY_KEYS) {
      const destination = `football:${profile.id}:${key}`;
      const legacy = localStorage.getItem(key);
      if (legacy !== null && localStorage.getItem(destination) === null) {
        localStorage.setItem(destination, legacy);
      }
    }
    localStorage.setItem(migrationKey, "1");
  }
  return profile;
}

function scopedKey(key) {
  return `football:${ensureBrowserProfile().id}:${key}`;
}

export const userStorage = {
  getItem(key) {
    return localStorage.getItem(scopedKey(key));
  },
  setItem(key, value) {
    localStorage.setItem(scopedKey(key), value);
    window.dispatchEvent(new Event(PROFILE_EVENT));
    window.dispatchEvent(new Event("football-picks-changed"));
  },
  matches(actualKey, key) {
    return actualKey === scopedKey(key);
  },
};

export function readUserJSON(key, fallback) {
  const value = userStorage.getItem(key);
  if (value === null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(
      "Saved browser data is unreadable. Keep your browser storage and contact the tool owner before making changes.",
    );
  }
}
