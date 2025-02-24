import { type FullConfig, chromium } from '@playwright/test'

const id = process.env.TEST_CLIENT_ID || ''
const pwd = process.env.TEST_CLIENT_PWD || ''

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const pageUrl = baseURL + '/login?returnUrl=%2Fmy%2Fbuying%3Ftab%3Dfinished'
  console.log('pageUrl', pageUrl)
  await page.goto(pageUrl)
  console.log('page loaded')

  await page.screenshot({ path: 'screenshot.png' })
  const email = page.locator('input[type="email"]')
  console.log('email', await email.innerHTML())
  await email.fill(id)

  const password = page.locator('input[type="password"]')
  console.log('password', await password.innerHTML())
  await password.fill(pwd)
  // await page.locator('button:has-text("로그인")').click()
  await page.getByRole('button', { name: '로그인' }).click()
  await page.waitForTimeout(1000)

  await page.context().storageState({ path: storageState as string })
  console.log('✅ Saved authentication state to ', storageState)

  await browser.close()
}

export default globalSetup
