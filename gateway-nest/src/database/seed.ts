import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User, UserRole } from '../users/user.entity';

// Seed data for local development, standing in for a real register
// endpoint until one exists. Passwords are still bcrypt-hashed here (not
// plaintext) - the same hashing this project will eventually use for
// login, so these accounts work correctly the moment login is built,
// with no changes needed to this seed data. Bob is the manager - the
// one account that'll be able to approve/reject pending_document
// submissions once that workflow exists (see user.entity.ts's UserRole
// comment); Alice stays a plain employee on purpose, so there's always
// a non-manager account to verify a manager-only endpoint actually
// rejects the wrong role, not just that it accepts the right one.
const SEED_USERS: { email: string; password: string; role: UserRole }[] = [
  { email: 'alice@example.com', password: 'Password123!', role: 'employee' },
  { email: 'bob@example.com', password: 'Password123!', role: 'manager' },
];

async function seed() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  for (const seedUser of SEED_USERS) {
    const existing = await userRepository.findOneBy({ email: seedUser.email });
    if (existing) {
      // Role is the one field this script still applies to an
      // already-seeded row - it's how a role change (like bob becoming
      // manager) reaches a database that was seeded before this field
      // existed, without needing a fresh DB or a hand-written UPDATE.
      // Password/email are deliberately left alone here - re-seeding
      // isn't meant to reset a password.
      if (existing.role !== seedUser.role) {
        existing.role = seedUser.role;
        await userRepository.save(existing);
        console.log(`Updated ${seedUser.email} role to ${seedUser.role}.`);
      } else {
        console.log(`Skipping ${seedUser.email} - already exists.`);
      }
      continue;
    }

    // The second argument (10) is bcrypt's "salt rounds" / cost factor -
    // conceptually the same idea as the iteration count baked into
    // ASP.NET Core's PasswordHasher<T>: higher means slower to compute,
    // which is exactly what you want for a hashing algorithm - it makes
    // brute-forcing expensive while a single legitimate login stays fast
    // enough to not notice. 10 is a common, reasonable default.
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    const user = userRepository.create({ email: seedUser.email, passwordHash, role: seedUser.role });
    await userRepository.save(user);
    console.log(`Created ${seedUser.email}.`);
  }

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
