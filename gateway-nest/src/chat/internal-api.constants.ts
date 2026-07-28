// Shared secret between this gateway and chatbot-rag-python - proves a
// request actually came from this trusted gateway, not a direct hit on
// the Python service's port. Must match the INTERNAL_API_KEY constant in
// chatbot-rag-python/main.py exactly.
//
// Unlike JwtSettings (a single shared file within one TypeScript
// project), this can't have one source of truth - the two services are
// different languages/repos, so keeping the value in sync on both sides
// is a manual responsibility, not something the compiler can enforce.
//
// NOTE: hardcoded here for learning purposes, same caveat as everywhere
// else in this project - a real app would read this from an environment
// variable/secrets manager on both sides.
export const INTERNAL_API_KEY = 'demo-only-internal-service-key-do-not-use-in-production';
