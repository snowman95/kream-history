import type { Browser, BrowserContext, Locator, Page } from '@playwright/test'

import { TestPageObject } from './TestPageObject'
import type { InventoryData, OrderData } from './type'

/**
 * 테스트 페이지 공통 기능 정의한 클래스 입니다.
 * 이 클래스를 상속받아 테스트 페이지 클래스를 구현하면 유틸리티 기능을 활용할 수 있습니다.
 */
export class KreamPageObject extends TestPageObject {
  constructor(page: Page) {
    super(page)
  }

  // 로그인 함수 분리하여 재사용성 향상
  async login(id: string, pwd: string): Promise<void> {
    await this.page.goto('/login?returnUrl=%2Fmy%2Fbuying%3Ftab%3Dfinished')

    const email = this.page.locator('input[type="email"]')
    await email.fill(id)

    const password = this.page.locator('input[type="password"]')
    await password.fill(pwd)

    const loginButton = this.page.getByRole('button', {
      name: '로그인',
      exact: true,
    })
    await loginButton.click()
  }

  /**
   * 인벤토리 정보 수집
   */
  async collectInventoryData(url: string): Promise<InventoryData> {
    const data: InventoryData = {
      코드: '',
      판매가: '',
      수수료: '',
    }

    await this.page.goto(url, { timeout: 30000 })
    // 코드 정보 수집
    data['코드'] =
      (await this.page.locator('span.code_text').textContent()) || ''
    const inventoryLocator = await this.page.locator('.inventory_text_line', {
      has: this.page.locator('p.value'),
    })

    const 판매가 = inventoryLocator.nth(1).locator('p.value')
    const 수수료 = inventoryLocator.nth(2).locator('p.value')
    data['판매가'] = (await 판매가.textContent())?.trim() || ''
    data['수수료'] = (await 수수료.textContent())?.trim() || ''

    return data
  }

  /**
   * 상세 페이지에서 라벨 데이터 수집
   */
  async collectOrderData(url: string): Promise<OrderData> {
    await this.page.goto(url, {
      timeout: 30000,
    })

    const allTitleLabels = this.page.locator('.title-labels')
    const 총구매가 = allTitleLabels.filter({ hasText: '총 구매가' })
    const 총수수료 = allTitleLabels.filter({ hasText: '총 수수료' })
    const 총포인트사용 = allTitleLabels.filter({ hasText: '총 포인트 사용' })
    const 거래일시 = allTitleLabels.filter({ hasText: '거래 일시' })

    const data: OrderData = {
      '상품 개수': (await this.page.locator('p', { hasText: '주문번호' }).all())
        .length,
      '총 구매가':
        (await 총구매가.getByRole('paragraph').last().textContent())?.trim() ||
        '',
      '총 수수료':
        (await 총수수료.getByRole('paragraph').last().textContent())?.trim() ||
        '',
      '총 포인트사용':
        (
          await 총포인트사용.getByRole('paragraph').last().textContent()
        )?.trim() || '',
      '거래 일시':
        (await 거래일시.getByRole('paragraph').last().textContent())?.trim() ||
        '',
      결제수단:
        (
          await this.page
            .locator('.layout_list_vertical', { hasText: '결제정보' })
            .locator('p')
            .last()
            .textContent()
        )?.trim() || '',
    }

    return data
  }
}
