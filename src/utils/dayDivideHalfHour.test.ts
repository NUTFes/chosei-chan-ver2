import { describe, expect, it } from 'vitest'
import { dayDivideQuarterHour } from '@/utils/dayDivideHalfHour'

describe('dayDivideQuarterHour', () => {
  it('1 日を 48 個の 30 分刻みの時刻に分ける', () => {
    const result = dayDivideQuarterHour(new Date(2026, 9, 23, 15, 20).getTime())

    expect(result).toHaveLength(48)
    expect(result[0]).toBe(new Date(2026, 9, 23, 0, 0).getTime())
    expect(result[result.length - 1]).toBe(new Date(2026, 9, 23, 23, 30).getTime())
    for (let i = 1; i < result.length; i++) {
      expect(result[i] - result[i - 1]).toBe(30 * 60 * 1000)
    }
  })

  it('同じ日なら入力時刻によらず同じ結果を返す', () => {
    const midnight = new Date(2026, 9, 23, 0, 0).getTime()
    const afternoon = new Date(2026, 9, 23, 15, 20).getTime()

    expect(dayDivideQuarterHour(afternoon)).toEqual(dayDivideQuarterHour(midnight))
  })
})
