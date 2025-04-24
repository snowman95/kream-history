import type { Locator, Page } from '@playwright/test'

/**
 * 테스트 페이지 공통 기능 정의한 클래스 입니다.
 * 이 클래스를 상속받아 테스트 페이지 클래스를 구현하면 유틸리티 기능을 활용할 수 있습니다.
 */
export class TestPageObject {
  constructor(protected page: Page) {}

  async adaptiveClick(selector: string) {
    await this.page.click(selector)
  }
  async adaptiveLocatorClick(
    locator: Locator,
    options?: { force?: boolean; timeout?: number; delay?: number },
  ) {
    // 요소가 가려져있으면 스크롤 하여 보이게 함
    await this.scrollElementIntoView(locator, { position: 'top' })

    await locator.click(options)
  }

  // 요소 존재 여부 확인하여 가져오기 (실제로 보이는 요소만 확인)
  async getVisibleLocator(
    locator: Locator,
    timeout = 1000,
  ): Promise<Locator | null> {
    try {
      await locator.waitFor({ state: 'visible', timeout })
      return locator.filter({ visible: true })
    } catch (error) {
      const count = await locator.count()
      if (count > 0) {
        // 요소는 존재하지만 visible 조건을 충족하지 못하는 경우
        // filter로 시도
        const filteredLocator = locator.filter({ visible: true })
        if ((await filteredLocator.count()) > 0) {
          return filteredLocator
        }
      }
      return null
    }
  }

  // 요소의 텍스트 확인
  async getLocatorTexts(locator: Locator): Promise<string[]> {
    const texts: string[] = []

    for (const option of await locator.all()) {
      texts.push((await option.textContent()) || '')
    }
    return texts
  }

  // 요소의 DOM 구조 출력
  async printDomStructure(locator: Locator): Promise<void> {
    const html = await locator.evaluate(element => {
      return element.outerHTML
    })
    console.log('HTML 구조:', html)
  }

  async scrollElementIntoView(
    locator: Locator,
    options: { position: 'center' | 'top' | 'bottom' } = { position: 'center' },
  ): Promise<void> {
    const boundingBox = await locator.boundingBox()
    if (!boundingBox) return

    // 현재 스크롤 위치 가져오기
    const currentScroll = await this.page.evaluate(() => {
      return { x: window.scrollX, y: window.scrollY }
    })

    // 중요: boundingBox는 뷰포트 기준이므로 현재 스크롤 위치를 더해 절대 위치로 변환
    const absoluteElementY = boundingBox.y + currentScroll.y

    // 이제 절대 위치 기준으로 타겟 위치 계산
    let targetY: number
    if (options.position === 'center') {
      targetY =
        absoluteElementY -
        (await this.page.evaluate(() => window.innerHeight)) / 2
    } else if (options.position === 'top') {
      targetY = absoluteElementY - 150 // 상단에서 약간 여유 공간
    } else if (options.position === 'bottom') {
      targetY =
        absoluteElementY -
        (await this.page.evaluate(() => window.innerHeight)) +
        boundingBox.height +
        100
    } else {
      targetY = absoluteElementY - 200
    }

    // 스크롤이 필요한지 확인
    const scrollThreshold = 150
    const shouldScroll = Math.abs(currentScroll.y - targetY) > scrollThreshold

    if (shouldScroll) {
      await this.page.evaluate(
        ({ x, y }) => {
          window.scrollTo({ left: x, top: y, behavior: 'smooth' })
        },
        { x: currentScroll.x, y: targetY },
      )
      await this.page.waitForTimeout(700)
    } else {
      await this.page.waitForTimeout(200)
    }
  }
}
