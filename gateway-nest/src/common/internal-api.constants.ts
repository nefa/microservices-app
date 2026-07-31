// Shared secret between this gateway and the Python services it calls
// (chatbot-rag-python's /chat and /documents/ingest, both guarded by
// verify_internal_request). Proves a request actually came from this
// trusted gateway, not a direct hit on a Python service's port. Must
// match INTERNAL_API_KEY in chatbot-rag-python/main.py exactly.
//
// Lives in src/common (not src/chat) because it's no longer chat-specific -
// the documents module needs the exact same value.
//
// Unlike JwtSettings (a single shared file within one TypeScript
// project), this can't have one source of truth - the Python service is
// a different language/repo, so keeping the value in sync on both sides
// is a manual responsibility, not something the compiler can enforce.
//
// NOTE: hardcoded here for learning purposes, same caveat as everywhere
// else in this project - a real app would read this from an environment
// variable/secrets manager on both sides.
export const INTERNAL_API_KEY = 'demo-only-internal-service-key-do-not-use-in-production';
