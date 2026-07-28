import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User } from '../users/user.entity';

// Seed data for local development, standing in for a real register
// endpoint until one exists. Passwords are still bcrypt-hashed here (not
// plaintext) - the same hashing this project will eventually use for
// login, so these accounts work correctly the moment login is built,
// with no changes needed to this seed data.
const SEED_USERS = [
  { email: 'alice@example.com', password: 'Password123!' },
  { email: 'bob@example.com', password: 'Password123!' },
];

async function seed() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  for (const seedUser of SEED_USERS) {
    const existing = await userRepository.findOneBy({ email: seedUser.email });
    if (existing) {
      console.log(`Skipping ${seedUser.email} - already exists.`);
      continue;
    }

    // The second argument (10) is bcrypt's "salt rounds" / cost factor -
    // conceptually the same idea as the iteration count baked into
    // ASP.NET Core's PasswordHasher<T>: higher means slower to compute,
    // which is exactly what you want for a hashing algorithm - it makes
    // brute-forcing expensive while a single legitimate login stays fast
    // enough to not notice. 10 is a common, reasonable default.
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    const user = userRepository.create({ email: seedUser.email, passwordHash });
    await userRepository.save(user);
    console.log(`Created ${seedUser.email}.`);
  }

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
