// Used for production builds (and as the fallback if no fileReplacement
// swaps it out - see angular.json's "development" build configuration).
// Committed to git - contains no real secrets. A real deploy would
// inject the actual values here via a build-time CI/CD step, not by
// hardcoding them in this checked-in file - Angular is a static SPA, so
// unlike the Node/Python services' env vars, there's no server process
// to read these at runtime; they have to be baked in when `ng build`
// runs, which is why this is a source file swapped per build
// configuration rather than an actual .env.
//
// gatewayUrl deliberately empty here, not defaulted to anything - was
// hardcoded independently in auth.ts/documents.ts/chat.ts until this
// file centralized it (three copies of the same localhost URL, each of
// which would have silently pointed a real deployed build's HTTP calls
// at the browser's own machine instead of the real gateway). Left empty
// rather than guessed, same reasoning as primeNgLicenseKey - a build
// that ships with this unset should fail loudly (every API call 404s/
// network-errors) rather than quietly working against the wrong host.
export const environment = {
  production: true,
  primeNgLicenseKey: '',
  gatewayUrl: '',
};
