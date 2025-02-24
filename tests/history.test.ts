import { type Page, test } from '@playwright/test'

import { saveResultsToFile, waitForElementAndClick } from './utils'

let page: Page
test.describe.configure({ mode: 'serial' })

const id = process.env.TEST_CLIENT_ID || ''
const pwd = process.env.TEST_CLIENT_PWD || ''
const LIMIT = 20

test.beforeAll(async ({ browser, baseURL }) => {
  if (!baseURL) {
    test.fail(true, 'playwright.config.ts 에서 baseURL 설정이 필요합니다.')
    return
  }
  page = await browser.newPage()

  // 콘솔 로그를 찍기 위해 필요한 코드입니다.
  page.on('console', msg => console.log(msg))

  const pageUrl = baseURL + '/login?returnUrl=%2Fmy%2Fbuying%3Ftab%3Dfinished'
  await page.goto(pageUrl)
})

test.describe('구매 내역 페이지', () => {
  test('로그인', async () => {
    const email = page.locator('input[type="email"]')
    await email.fill(id)

    const password = page.locator('input[type="password"]')
    await password.fill(pwd)
    const loginButton = page.locator('button[type="submit"].btn.full.solid')
    await loginButton.click()
  })

  test('구매 내역 페이지', async () => {
    const selector = '.svg-icon-mapper'
    const labelSelector = '.title-labels'
    const results = []
    let detailPagesCount = 0

    while (detailPagesCount < LIMIT) {
      const data = {} as any

      await page.waitForSelector('a.product_list_info_action')
      // <a> 태그 선택
      const anchorElements = await page.locator('a.product_list_info_action')
      const currentAnchorElement = anchorElements.nth(detailPagesCount)

      // 현재 <a> 태그 하위의 마지막 <p> 태그 선택
      const paragraphElements = await currentAnchorElement.locator(
        'p.text-lookup.text-element.display_paragraph',
      )
      const lastParagraphElement = paragraphElements.last()
      const text = await lastParagraphElement.textContent()

      if (text === '구매거부') {
        detailPagesCount += 1
        continue
      }

      await lastParagraphElement.click()

      // await page.waitForTimeout(3000)
      await page.waitForSelector('span.code_text')
      const codeText = await page.locator('span.code_text').textContent()
      data['코드'] = codeText || ''

      const layerContent = await page.locator('.layer_content').last()
      await layerContent.waitFor()
      const inventories = await page
        .locator('.inventory_text_line')
        .elementHandles()

      for (const inventory of inventories) {
        const labelData = await inventory.evaluate(node => {
          const element = node as Element
          const key = element.querySelector('.key')
          const value = element.querySelector('.value')
          const keyText = key?.textContent || ''
          const valueText = value?.textContent || ''
          // keyText가 빈 문자열이 아닌 경우에만 객체를 반환
          if (keyText && keyText !== ' ') {
            return { [keyText.trim()]: valueText.trim() }
          }
          return {} // 빈 객체 반환
        })

        Object.assign(data, labelData)
      }
      await page.goBack()

      // 구매 내역 수집
      await page.waitForSelector(selector)
      const detailPages = await page.locator(selector).elementHandles()
      if (
        detailPages.length <= detailPagesCount ||
        !detailPages[detailPagesCount]
      ) {
        break
      }
      await waitForElementAndClick(detailPages[detailPagesCount])
      await page.waitForSelector(labelSelector)
      const labels = await page.locator(labelSelector).elementHandles()
      for (const label of labels) {
        const labelData = await label.evaluate(node => {
          const element = node as Element
          const pElement = element.querySelectorAll('p')
          const tempData: Record<string, string> = {}
          pElement.forEach((element, index) => {
            const text = element.textContent?.trim() || ''
            if (index % 2 === 0) {
              if (text) {
                tempData[text] = ''
              }
            } else {
              const key = pElement[index - 1].textContent || ''
              if (key) {
                tempData[key] = text
              }
            }
          })
          return tempData
        })

        const layoutListVertical = await page.locator('.layout_list_vertical')
        const layoutListVerticalCount = await layoutListVertical.count()
        const layoutListVerticalElement = await layoutListVertical.nth(
          layoutListVerticalCount - 1,
        )
        const layoutListVerticalData =
          await layoutListVerticalElement.locator('p')
        const target = layoutListVerticalData.last()
        data['결제수단'] = await target.textContent()

        Object.assign(data, labelData)
      }
      await page.goBack()

      detailPagesCount += 1
      results.push(data)
    }

    await saveResultsToFile(results, 'history.json')
  })
})
