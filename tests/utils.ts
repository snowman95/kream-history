import { type Page, test } from '@playwright/test'
import fs from 'fs'

interface NavigateAndCollectDataOptions {
  page: Page
  selector: string
  labelSelector: string
  closeSelector?: string
  dataProcessor: (node: Element) => Record<string, string>
}

export async function navigateAndCollectData({
  page,
  selector,
  labelSelector,
  closeSelector,
  dataProcessor,
}: NavigateAndCollectDataOptions) {
  const results = []
  let detailPagesCount = 0

  while (true) {
    const data = {} as any

    // 판매 내역 수집
    await page.waitForTimeout(2000)
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

    await page.waitForTimeout(3000)
    await page.waitForSelector('.layer_content')
    const inventories = await page
      .locator('.inventory_text_line')
      .elementHandles()

    for (const inventory of inventories) {
      const labelData = await inventory.evaluate(dataProcessor)
      Object.assign(data, labelData)
    }

    if (closeSelector) {
      const closeButton = await page.locator(closeSelector).elementHandles()
      if (closeButton.length) {
        await closeButton[0].click()
      }
    } else {
      await page.goBack()
    }

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
      const labelData = await label.evaluate(dataProcessor)
      Object.assign(data, labelData)
    }

    if (closeSelector) {
      const closeButton = await page.locator(closeSelector).elementHandles()
      if (closeButton.length) {
        await closeButton[0].click()
      }
    } else {
      await page.goBack()
    }

    detailPagesCount += 1
    results.push(data)
  }
  return results
}

export async function waitForElementAndClick(elementHandle: any) {
  await elementHandle.waitForElementState('visible')
  await elementHandle.waitForElementState('stable')
  await elementHandle.waitForElementState('enabled')
  await elementHandle.click()
}

export async function saveResultsToFile(results: any[], filename: string) {
  const jsonData = JSON.stringify(results, null, 2)
  fs.writeFileSync(filename, jsonData, 'utf-8')
}
