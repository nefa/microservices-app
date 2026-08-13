import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface LoginResult {
  user: AuthenticatedUser;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);

    // Deliberately the SAME error for both "email doesn't exist" and
    // "password is wrong" - see TaskApi's login endpoint for why:
    // differing responses would let an attacker enumerate valid emails
    // just by watching which error comes back.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // "sub" (subject) is the standard JWT claim for "the user this token
    // is about" - same convention used in TaskApi's TokenService. role
    // rides along in the token too, the same way ARCHITECTURE.md/
    // PROJECT-Structure-diagram.md already plan for a subscription-tier
    // claim - a manager-only endpoint (once one exists) reads this off
    // the verified token instead of re-querying the user table on every
    // request.
    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role });

    // Deliberately excludes passwordHash - same rule as TaskApi's
    // UserResponseDto, enforced here by only picking the fields we want
    // rather than returning the raw entity.
    return {
      user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
      token,
    };
  }
}
