import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PasswordStrengthMeter from '~/components/Form/PasswordStrengthMeter.vue'

/**
 * The one strength rubric signup, reset and change-password share:
 * length ≥ 8, a digit, a lowercase and an uppercase letter, scored as
 * the number met. `score` and `color` are exposed on purpose — the
 * forms read them. The labels are the component's own `<i18n>` (el),
 * which the global `$i18n` cannot reach.
 */
const LABEL = {
  weak: 'Αδύναμος κωδικός',
  medium: 'Μέτριος κωδικός',
  strong: 'Ισχυρός κωδικός',
}

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
  ])('scores "$password" $score of 4 ($label)', async ({ password, score, color, label }) => {
    const wrapper = await mountMeter(password)

    expect((wrapper.vm as unknown as { score: number }).score).toBe(score)
    expect((wrapper.vm as unknown as { color: string }).color).toBe(color)
    expect(wrapper.find('[role="status"] p').text()).toBe(label)
  })

  it('announces changes politely and lists the four requirements', async () => {
    const wrapper = await mountMeter('abc')

    const status = wrapper.find('[role="status"]')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.findAll('li')).toHaveLength(4)
  })

  it('renders nothing before anything is typed', async () => {
    const wrapper = await mountMeter('')

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
