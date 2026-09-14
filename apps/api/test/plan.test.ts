import { summaryIsSafe } from '../src/lib/plan'
describe('summary wording guard', () => {
  it('blocks medical vocabulary in model output', () => {
    expect(summaryIsSafe('You did 8 stands and 10 heel raises. Your arm raise went higher than last week.')).toBe(true)
    expect(summaryIsSafe('Your rehab is progressing and pain should reduce.')).toBe(false)
  })
})
