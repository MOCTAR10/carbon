import { expect, type Page, type TestInfo } from '@playwright/test'
import { fakeIp } from '../support/data'

/** Collect console errors and uncaught page errors; call `.check()` at the end of the test. */
export function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() !== 'error') return
    const text = m.text()
    // Expected noise: favicon/asset 404s and the browser's own "Failed to load resource" for handled 4xx
    if (/favicon|Failed to load resource/i.test(text)) return
    errors.push(`console: ${text}`)
  })
  return { errors, check: () => expect(errors, errors.join('\n')).toEqual([]) }
}

/** Neither the document nor the app's scrolling <main> may scroll sideways. */
export async function expectNoHorizontalOverflow(page: Page) {
  const o = await page.evaluate(() => {
    const doc = document.documentElement
    const main = document.querySelector('main')
    return {
      doc: doc.scrollWidth - window.innerWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    }
  })
  expect(o.doc, 'document overflows horizontally').toBeLessThanOrEqual(1)
  expect(o.main, '<main> overflows horizontally').toBeLessThanOrEqual(1)
}

/** Browser requests get their own client IP so the register/login rate limits don't couple tests. */
export async function isolateIp(page: Page) {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': fakeIp() })
}

/** Sonner toast with the given text. */
export function toast(page: Page, text: string | RegExp) {
  return page.locator('[data-sonner-toast]').filter({ hasText: text })
}

export const isMobile = (info: TestInfo) => info.project.name === 'mobile'
