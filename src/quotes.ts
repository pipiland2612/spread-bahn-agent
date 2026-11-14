import type { PriceRequest, QuoteAction } from '../vendor/spread/types.ts'
import type { Model } from './policy.ts'

export type QuoteSettings = { mode: 'first' | 'options'; multiplier: number }
export function validateQuotes(settings: QuoteSettings) {
  if (!['first', 'options'].includes(settings.mode) || !Number.isFinite(settings.multiplier) || settings.multiplier <= 0) throw new Error('Invalid quote settings')
}

/** Level 4 prices: assess each deadline and actual offered price independently. */
export function planQuote(model: Model, request: PriceRequest, now: number, settings: QuoteSettings): QuoteAction | null {
  validateQuotes(settings)
  if (now >= request.respondBy || !request.options.length) return null
  const prices: QuoteAction['prices'] = {}
  const cents = (value: number) => {
    const rounded = Math.max(1, Math.round(value))
    if (!Number.isSafeInteger(rounded)) throw new Error('Quote exceeds safe integer cents')
    return rounded
  }
  for (const option of settings.mode === 'first' ? request.options.slice(0, 1) : request.options) {
    const price = cents(option.listPriceCents * settings.multiplier)
    if (model.assess({ ...request, options: [{ ...option, listPriceCents: price }] }, now).accept) prices[option.kind] = price
  }
  // Official Level 4 decline mechanism avoids the unquoted goodwill penalty.
  if (!Object.keys(prices).length) prices[request.options[0]!.kind] = cents(request.options[0]!.listPriceCents * 100)
  return { type: 'quote', requestId: request.id, prices }
}
