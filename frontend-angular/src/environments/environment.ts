// Used for production builds (and as the fallback if no fileReplacement
// swaps it out - see angular.json's "development" build configuration).
// Committed to git - contains no real secrets. A real production deploy
// would inject the actual value here via a build-time CI/CD step, not by
// hardcoding it in this checked-in file.
export const environment = {
  production: true,
  primeNgLicenseKey: '',
};
