// Shared between AuthModule (which SIGNS tokens on login) and, later,
// whatever guard VALIDATES them on protected routes - both sides must
// use the exact same secret, the same requirement as TaskApi's
// JwtSettings.cs.
//
// NOTE: hardcoded here for learning purposes, same caveat as everywhere
// else in this project - in a real app this would come from an
// environment variable/secrets manager, never committed to source
// control. Whoever holds this secret can forge valid tokens for ANY user.
export const jwtConstants = {
  secret: 'demo-only-gateway-jwt-secret-do-not-use-in-production',
  expiresIn: '2h',
} as const;
