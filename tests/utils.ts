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
    const paragraphElements = await currentAnchorElement
      .getByRole('paragraph')
      .locator('.text-lookup.text-element.display_paragraph')
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
    const detailPages = page.locator(selector)

    if ((await detailPages.count()) <= detailPagesCount) {
      break
    }

    await waitForElementAndClick(detailPages.nth(detailPagesCount))
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

export const getTimeBasedFileName = () => {
  const now = new Date()
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
  return `history_${timestamp}.json`
}

// 데이터를 즉시 파일에 추가
export const appendResultToFile = (data: any[], filePath: string) => {
  try {
    let existingData: any[] = []
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8')
      if (fileContent) {
        existingData = JSON.parse(fileContent)
      }
    }
    existingData.push(...data)
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2))
    console.log(`데이터 ${data.length}건이 ${filePath}에 추가되었습니다.`)
  } catch (error) {
    console.error('파일 저장 중 오류 발생:', error)
  }
}

// 지연 함수 - 요청 제한 회피를 위한 대기
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 랜덤 지연 함수 - 요청 패턴 분산
export async function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delayTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return delay(delayTime)
}

export async function dynamicScrollingStrategy(page: Page, maxScrolls = 30) {
  let lastHeight = await page.evaluate(() => document.body.scrollHeight)
  let scrolls = 0

  while (scrolls < maxScrolls) {
    scrolls++
    // 70% 지점으로 스크롤해서 로딩 트리거
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight * 0.7),
    )
    await page.waitForTimeout(1000)

    // 완전히 아래로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1500)

    const newHeight = await page.evaluate(() => document.body.scrollHeight)
    if (newHeight === lastHeight) break
    lastHeight = newHeight
  }
}
