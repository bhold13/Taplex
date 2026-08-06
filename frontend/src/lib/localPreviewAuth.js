const usersKey = "taplex.preview.users";
const sessionKey = "taplex.preview.session";
const guestUid = "preview-guest";
export const localPreviewAuthEvent = "taplex:preview-auth-change";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readUsers() {
  const storage = getBrowserStorage();

  if (!storage) {
    return {};
  }

  try {
    return JSON.parse(storage.getItem(usersKey) || "{}");
  } catch {
    return {};
  }
}

function writeUsers(users) {
  const storage = getBrowserStorage();

  if (storage) {
    storage.setItem(usersKey, JSON.stringify(users));
  }
}

function createPreviewUid(email) {
  let hash = 2166136261;

  for (let index = 0; index < email.length; index += 1) {
    hash ^= email.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `preview-${(hash >>> 0).toString(36)}`;
}

function writeSession(user) {
  const storage = getBrowserStorage();

  if (storage) {
    storage.setItem(
      sessionKey,
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        provider: "local-preview",
        signedInAt: new Date().toISOString()
      })
    );
    window.dispatchEvent(new Event(localPreviewAuthEvent));
  }
}

function createSalt() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

async function hashPassword(password, salt) {
  const value = `${salt}:${password}`;

  if (typeof crypto === "undefined" || !crypto.subtle) {
    return btoa(value);
  }

  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function registerLocalPreviewUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users[normalizedEmail]) {
    throw new Error("A local preview account already exists for this email. Use Login instead.");
  }

  const salt = createSalt();
  users[normalizedEmail] = {
    uid: createPreviewUid(normalizedEmail),
    email: normalizedEmail,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString()
  };

  writeUsers(users);
  writeSession(users[normalizedEmail]);

  return { uid: users[normalizedEmail].uid, email: normalizedEmail };
}

export async function loginLocalPreviewUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users[normalizedEmail];

  if (!user) {
    throw new Error("No local preview account exists for this email. Create one from Join first.");
  }

  const passwordHash = await hashPassword(password, user.salt);

  if (passwordHash !== user.passwordHash) {
    throw new Error("Incorrect password for this local preview account.");
  }

  const userWithUid = user.uid ? user : { ...user, uid: createPreviewUid(normalizedEmail) };

  if (!user.uid) {
    users[normalizedEmail] = userWithUid;
    writeUsers(users);
  }

  writeSession(userWithUid);

  return { uid: userWithUid.uid, email: normalizedEmail };
}

export function sendLocalPreviewReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (!users[normalizedEmail]) {
    throw new Error("No local preview account exists for this email.");
  }

  return { email: normalizedEmail };
}

export function getLocalPreviewSession() {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const session = JSON.parse(storage.getItem(sessionKey) || "null");

    if (!session?.email) {
      return null;
    }

    return {
      uid: session.uid || createPreviewUid(session.email),
      email: session.email,
      provider: "local-preview"
    };
  } catch {
    return null;
  }
}

export function getLocalPreviewIdentity() {
  return getLocalPreviewSession() || { uid: guestUid, email: "", provider: "local-preview" };
}

export function logoutLocalPreviewUser() {
  const storage = getBrowserStorage();

  if (storage) {
    storage.removeItem(sessionKey);
    window.dispatchEvent(new Event(localPreviewAuthEvent));
  }
}
