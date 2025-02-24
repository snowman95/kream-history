import { type PlaywrightTestConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Read from default ".env" file.
dotenv.config({ path: '.env' })
const baseURL = 'https://www.kream.co.kr'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
// const webServerConfig = IS_LOCAL
//   ? {
//       webServer: {
//         command: `pnpm next dev -p 3004`,
//         url: baseURL,
//         timeout: 120 * 1000,
//         reuseExistingServer: !process.env.CI,
//       },
//     }
//   : {}

const config: PlaywrightTestConfig = {
  // globalSetup: require.resolve('./global-setup'),
  testDir: '.',
  // 각 테스트가 실행될 수 있는 최대 시간
  timeout: 5 * 60 * 1000,
  expect: {
    // expect 함수가 조건을 만족할 때까지 기다리는 최대 시간
    timeout: 10 * 1000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    // storageState: 'tests/state.json',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retry-with-trace',
    headless: false,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },

    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },

    // Test against mobile viewports.
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: devices['iPhone 12'],
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     channel: 'msedge',
    //   },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     channel: 'chrome',
    //   },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  // ...webServerConfig,
}
export default config
