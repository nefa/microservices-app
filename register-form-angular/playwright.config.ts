import { defineConfig, devices } from '@playwright/test';

// E2E for the registration flow only, for now (see ../ARCHITECTURE.md's
// discussion of test strategy) - this drives the real Angular app in a
// real browser against the real lma-mock-nest, not against mocked
// network calls, so what passes here is what actually works end to end.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4222',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Starts both halves of the flow this suite actually exercises.
  // reuseExistingServer locally means these tests work whether you
  // already have both dev servers running (the normal workflow in this
  // repo - see ../INSTRUCTIONS.md) or not; CI always starts fresh so a
  // stale/crashed server from a previous run can't produce a false pass.
  webServer: [
    {
      command: 'npm start',
      url: 'http://localhost:4222',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
    {
      command: 'npm run start:dev',
      cwd: '../lma-mock-nest',
      url: 'http://localhost:43022/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
