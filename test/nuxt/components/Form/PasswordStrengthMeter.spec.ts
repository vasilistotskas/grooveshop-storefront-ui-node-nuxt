import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PasswordStrengthMeter from '~/components/Form/PasswordStrengthMeter.vue'

/**
 * The one strength rubric sign-up and password reset share: length ≥ 8,
 * a digit, a lowercase and an uppercase letter (Unicode — Greek letters
 * count), scored as the number met, drawn as four segments and one line.
 * `score` and `color` are exposed on purpose. The labels are the
 * component's own `<i18n>` (el), which the global `$i18n` cannot reach.
 */
const LABEL = {
  weak: 'Αδύναμος',
  medium: 'Μέτριος',
  strong: 'Ισχυρός',
}
const RUBRIC = '8+ χαρακτήρες, ένας αριθμός, κεφαλαία και πεζά'

const mountMeter = (password: string) =>
  mountSuspended(PasswordStrengthMeter, { route: false, props: { password } })

describe('Form/PasswordStrengthMeter', () => {
  it.each([
    { password: 'abc', score: 1, color: 'error', label: LABEL.weak },
    { password: 'abcdefgh', score: 2, color: 'error', label: LABEL.weak },
    { password: 'abcdefg1', score: 3, color: 'warning', label: LABEL.medium },
    { password: 'Abcdefg1', score: 4, color: 'success', label: LABEL.strong },
    // Seven characters miss only the length rule.
    { password: 'Abcdef1', score: 3, color: 'warning', label: LABEL.medium },
    { password: '12345678', score: 2, color: 'error', label: LABEL.weak },
    { password: 'ABCDEFGH', score: 2, color: 'error', label: LABEL.weak },
    // Greek letters are letters: [a-z] never matched them.
    { password: 'Καλημέρα2024', score: 4, color: 'success', label: LABEL.strong },
    { password: 'καλημέρα2024', score: 3, color: 'warning', label: LABEL.medium },
  ])('scores "$password" $score of 4 ($label)', async ({ password, score, color, label }) => {
    const wrapper = await mountMeter(password)

    expect((wrapper.vm as unknown as { score: number }).score).toBe(score)
    expect((wrapper.vm as unknown as { color: string }).color).toBe(color)
    expect(wrapper.find('[role="status"] p').text()).toBe(`${label} · ${RUBRIC}`)
  })

  it('announces changes politely', async () => {
    const wrapper = await mountMeter('abc')

    expect(wrapper.find('[role="status"]').attributes('aria-live')).toBe('polite')
  })

  it('renders nothing before anything is typed', async () => {
    const wrapper = await mountMeter('')

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
