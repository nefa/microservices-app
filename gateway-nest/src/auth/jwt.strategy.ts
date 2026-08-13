import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './jwt.constants';
import { UserRole } from '../users/user.entity';

interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

// Passport is Nest's standard mechanism for authentication strategies -
// this is the direct parallel to TaskApi's
// AddAuthentication().AddJwtBearer(options => { TokenValidationParameters
// = ... }) in Program.cs. Registering this class (see AuthModule) is what
// makes AuthGuard('jwt') usable to protect routes elsewhere in the app.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Same idea as TaskApi's TokenValidationParameters: tells Passport
      // where to find the token (the Authorization: Bearer header) and
      // what secret to verify its signature against.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  // Called automatically once Passport has already verified the token's
  // signature and expiry - by the time this runs, the token is already
  // known to be genuine. Whatever this returns becomes `request.user` in
  // any guarded route handler.
  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
