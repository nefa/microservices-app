import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LmaRegistrationException } from './lma-registration.exception';
import { SEED_USERS } from './seed-users';

interface RegistrationRecord {
  email: string;
  passwordHash: string;
  jobFunction: string;
  role: string;
  requestedFeatures: string[];
  defaultFeatures: string[];
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  registeredAt: Date;
}

// What GET /registrations returns - everything except passwordHash.
// Deliberately excludes it the same way gateway-nest's AuthService.login()
// excludes it from its response: a debug/inspection endpoint is still a
// place a hash shouldn't leak from, even in a local mock.
export type PublicRegistrationRecord = Omit<RegistrationRecord, 'passwordHash'>;

// At least one special character - the same rule
// register-form-angular's registration-model.ts enforces client-side
// (its own SPECIAL_CHAR constant). That one is UX only; this is the
// actual enforcement, since a request that skips the form entirely
// (calling this API directly) bypasses the client-side check completely.
const SPECIAL_CHAR = /[^A-Za-z0-9]/;

@Injectable()
export class RegistrationsService implements OnModuleInit {
  // In-memory only, on purpose - this service simulates the 3rd-party
  // LMA for local dev, it isn't LMA itself, so there's no real database
  // to stand up for it (unlike gateway-nest's actual Postgres-backed
  // User table). Restarting the process resets every registration made
  // through it, aside from the seeded demo users re-added below.
  private readonly registrations = new Map<string, RegistrationRecord>();

  async onModuleInit(): Promise<void> {
    for (const seedUser of SEED_USERS) {
      await this.seed(seedUser.email, seedUser.password);
    }
  }

  private async seed(email: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 10);
    this.registrations.set(email.toLowerCase(), {
      email,
      passwordHash,
      // Placeholder profile data - gateway-nest's seed only ever needed
      // email/password, but a full LMA registration record carries more.
      // These values just need to exist, not be meaningful.
      jobFunction: 'N/A',
      role: 'engineer',
      requestedFeatures: [],
      defaultFeatures: ['chat', 'document-submit'],
      addressLine1: 'N/A',
      addressLine2: '',
      city: 'N/A',
      postalCode: 'N/A',
      country: 'N/A',
      emergencyContactName: 'N/A',
      emergencyContactPhone: 'N/A',
      emergencyContactRelationship: '',
      registeredAt: new Date(),
    });
  }

  isAvailable(email: string): boolean {
    return !this.registrations.has(email.toLowerCase());
  }

  // No pgAdmin equivalent exists for this service - it's in-memory, not
  // Postgres (see the class comment on `registrations` above) - so this
  // is the way to check "did a new subscriber actually register?"
  // locally: GET /registrations, not a database GUI.
  list(): PublicRegistrationRecord[] {
    return Array.from(this.registrations.values())
      .map((record) => {
        const { passwordHash: _passwordHash, ...publicRecord } = record;
        return publicRecord;
      })
      .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());
  }

  async register(dto: RegisterDto): Promise<void> {
    // Password policy first (400) - a request-shape problem the caller
    // can fix regardless of which email it's for - then the email
    // conflict (409), which is specific to this particular email.
    if (dto.password.length < 8 || !SPECIAL_CHAR.test(dto.password)) {
      throw new LmaRegistrationException(
        'PASSWORD_POLICY',
        'Password must be at least 8 characters and include a special character.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const key = dto.email.toLowerCase();
    if (this.registrations.has(key)) {
      throw new LmaRegistrationException('EMAIL_TAKEN', 'This email is already registered.', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    this.registrations.set(key, {
      email: dto.email,
      passwordHash,
      jobFunction: dto.jobFunction,
      role: dto.role,
      requestedFeatures: dto.requestedFeatures,
      defaultFeatures: dto.defaultFeatures,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      postalCode: dto.postalCode,
      country: dto.country,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactPhone: dto.emergencyContactPhone,
      emergencyContactRelationship: dto.emergencyContactRelationship,
      registeredAt: new Date(),
    });
  }
}
