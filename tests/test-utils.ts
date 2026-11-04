import assert from 'node:assert'
export { describe, it } from 'node:test'

export const expect = (actual: any) => ({
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  toBeNull: () => assert.strictEqual(actual, null),
  toContain: (expected: any) => {
    assert(
      String(actual).includes(expected),
      `Expected "${actual}" to contain "${expected}"`
    )
  },
  not: {
    toContain: (expected: any) => {
      assert(
        !String(actual).includes(expected),
        `Expected "${actual}" NOT to contain "${expected}"`
      )
    },
  },
})
