// Same two demo accounts gateway-nest seeds into its own Postgres `user`
// table (see gateway-nest/src/database/seed.ts and INSTRUCTIONS.md's
// "Demo login" table). Kept as a separate, parallel list here rather than
// imported across services - this is a different system (LMA has its own
// store, per ARCHITECTURE.md) that just happens to agree on the same demo
// identities, so the EMAIL_TAKEN path is exercisable against
// register-form-angular immediately, without registering a throwaway
// account first.
export const SEED_USERS = [
  { email: 'alice@example.com', password: 'Password123!' },
  { email: 'bob@example.com', password: 'Password123!' },
];
