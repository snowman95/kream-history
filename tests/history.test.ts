import {
  Browser,
  BrowserContext,
  type Page,
  test as base,
} from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

import { KreamPageObject } from './KreamPageObject'
import { appendResultToFile, getTimeBasedFileName } from './utils'

// 테스트별 고정 변수 정의
const id = process.env.TEST_CLIENT_ID || ''
const pwd = process.env.TEST_CLIENT_PWD || ''
const LIMIT = 40

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
    const result: any[] = []

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

      const orderList = await securePage.locator('div.my-order-list > a')
      const totalCount = await orderList.count()
      console.log('totalCount: ', totalCount)
      const collectBuyingData: string[] = []
      const inventoryUrlList: string[] = []

      for (let i = 0; i < totalCount; i += 2) {
        const inventoryLocator = await orderList
          .nth(i + 1)
          .locator('a', { hasText: '창고보관' })

        const isVisible = await inventoryLocator.isVisible()
        if (isVisible) {
          // 화살표
          const myOrderUrl = (await orderList.nth(i).getAttribute('href')) || ''
          const inventoryUrl =
            (await inventoryLocator.getAttribute('href')) || ''

          if (myOrderUrl) collectBuyingData.push(myOrderUrl)
          if (inventoryUrl) inventoryUrlList.push(inventoryUrl)
        }
      }

      console.log('collectBuyingData 개수: ', collectBuyingData.length)
      console.log('inventoryUrlList 개수: ', inventoryUrlList.length)
      const 가져올개수 = Math.min(
        collectBuyingData.length,
        inventoryUrlList.length,
        LIMIT,
      )
      console.log('가져올개수: ', 가져올개수)

      for (let i = 0; i < 가져올개수; i++) {
        const labelData = await kreamPage.collectOrderData(collectBuyingData[i])
        const inventoryData = await kreamPage.collectInventoryData(
          inventoryUrlList[i],
        )
        result.push({ ...inventoryData, ...labelData })
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
