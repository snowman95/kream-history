import {
  Browser,
  BrowserContext,
  type Page,
  test as base,
} from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

import { KreamPageObject } from './KreamPageObject'
import type { InventoryData, KreamData } from './type'
import { appendResultToFile, getTimeBasedFileName } from './utils'

// 테스트별 고정 변수 정의
const id = process.env.TEST_CLIENT_ID || ''
const pwd = process.env.TEST_CLIENT_PWD || ''
const LIMIT = 50

// 커스텀 타입 정의
type KreamFixtures = {
  kreamPage: KreamPageObject
  secureContext: BrowserContext
  securePage: Page
  browser: Browser
}

// 커스텀 테스트 픽스처 설정
const test = base.extend<KreamFixtures>({
  // Cross-Origin 격리 우회를 위한 보안 컨텍스트
  secureContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      bypassCSP: true, // Content Security Policy 우회
      // 필요한 경우 추가 헤더 설정
      extraHTTPHeaders: {
        'Access-Control-Allow-Origin': '*',
      },
      // 성능 최적화를 위한 설정
      viewport: { width: 1280, height: 720 }, // 작은 뷰포트 설정
      deviceScaleFactor: 1, // 낮은 DPI 설정
      javaScriptEnabled: true,
      hasTouch: false,
    })

    // 리소스 최적화: 불필요한 리소스 차단
    await context.route(
      '**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}',
      route => {
        // 이미지 및 폰트 리소스를 최소화하여 성능 향상
        route.abort()
      },
    )

    await use(context)
    await context.close()
  },

  // 보안 컨텍스트에서 생성한 페이지
  securePage: async ({ secureContext }, use) => {
    const page = await secureContext.newPage()
    // page.on('console', msg => {
    //   console.log(msg)
    // })

    // 페이지 성능 최적화: 타임아웃 설정
    page.setDefaultTimeout(10000) // 기본 타임아웃 10초
    page.setDefaultNavigationTimeout(15000) // 네비게이션 타임아웃 15초

    await use(page)
  },

  // 페이지 객체 확장
  kreamPage: async ({ securePage }, use) => {
    // 페이지 객체 생성
    const kreamPage = new KreamPageObject(securePage)

    await use(kreamPage)
  },
})

test.describe('KREAM 구매 내역 페이지', () => {
  test('구매 내역 수집', async ({ securePage, kreamPage }) => {
    const result: KreamData[] = []

    // 로그인
    await kreamPage.login(id, pwd)

    await test.step('구매 내역 데이터 수집', async () => {
      await securePage.waitForTimeout(1000) // 새 항목이 로드될 시간 기다림
      // 스크롤하여 더 많은 상품 로드
      for (let i = 0; i < LIMIT / 2; i++) {
        // await dynamicScrollingStrategy(securePage)
        await securePage.evaluate(() => {
          window.scrollBy(0, window.innerHeight)
        })
        await securePage.waitForTimeout(200) // 새 항목이 로드될 시간 기다림
      }

      const orderUrls: string[] = []
      const inventoryUrls: string[] = []

      // "주문 상세" 링크 추출
      const orderList = await securePage.locator('div.my-order-list')
      const orderUrlList = await orderList.locator('.text-header-checkout')
      for (let i = 0; i < (await orderUrlList.count()); i++) {
        const orderUrl = await orderUrlList.nth(i).getAttribute('href')
        if (orderUrl) orderUrls.push(orderUrl)
      }

      // "창고보관" 링크 추출
      const inventoryUrlList = await orderList
        .locator('a')
        .locator('a', { hasText: '창고보관' })
      for (let i = 0; i < (await inventoryUrlList.count()); i++) {
        const inventoryUrl = await inventoryUrlList.nth(i).getAttribute('href')
        if (inventoryUrl) inventoryUrls.push(inventoryUrl)
      }

      const 가져올주문개수 = Math.min(
        orderUrls.length,
        inventoryUrls.length,
        LIMIT,
      )
      console.log('발견된 주문 개수: ', orderUrls.length)
      console.log('발견된 상품 개수: ', inventoryUrls.length)
      console.log('거기서 가져올 주문 개수: ', 가져올주문개수)

      let inventoryIndex = 0
      for (let i = 0; i < 가져올주문개수; i++) {
        const orderUrl = orderUrls[i]
        const orderData = await kreamPage.collectOrderData(orderUrl)
        const 상품개수 = orderData['상품 개수']

        // 이 order에 해당하는 inventory들을 모음
        const inventories: InventoryData[] = []
        for (let j = 0; j < 상품개수; j++) {
          if (inventoryIndex >= inventoryUrls.length) break
          const inventoryData = await kreamPage.collectInventoryData(
            inventoryUrls[inventoryIndex],
          )
          inventories.push(inventoryData)
          inventoryIndex++
        }

        // order 정보와 해당 inventories를 묶어서 저장
        result.push({ orderData, inventories })
      }
      // 시간 기반 파일명 생성
      const timeBasedFileName = getTimeBasedFileName()
      const historyFilePath = path.join(process.cwd(), timeBasedFileName)

      // 빈 배열로 파일 초기화
      fs.writeFileSync(historyFilePath, JSON.stringify([], null, 2))
      console.log(`데이터 수집을 시작합니다. 저장 파일: ${historyFilePath}`)
      appendResultToFile(result, historyFilePath)
    })
  })
})
