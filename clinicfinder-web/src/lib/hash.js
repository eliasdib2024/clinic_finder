// Demo-only password hashing (FNV-1a). A real backend must use bcrypt/argon2 server-side.
export function hashPassword(pw) {
  let h = 0x811c9dc5;
  const s = `cf::${pw}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv1a$${h.toString(16)}`;
}
