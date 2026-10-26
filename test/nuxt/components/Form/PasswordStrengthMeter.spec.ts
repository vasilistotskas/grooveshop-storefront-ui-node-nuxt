import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PasswordStrengthMeter from '~/components/Form/PasswordStrengthMeter.vue'
import WebsidePasswordStrengthMeter from '~/components/variants/webside/Form/PasswordStrengthMeter.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The one strength rubric sign-up and password reset share
 * (`passwordStrength`): length ≥ 8, a digit, a lowercase and an uppercase
 * letter (Unicode — Greek letters count), scored as the number met.
 * `score` and `color` are exposed on purpose. The labels are each tree's
 * own `<i18n>` (el), which the global `$i18n` cannot reach.
 */
const LABEL = {
  default: { weak: 'Αδύναμος', medium: 'Μέτριος', strong: 'Ισχυρός' },
  webside: { weak: 'Αδύναμος κωδικός', medium: 'Μέτριος κωδικός', strong: 'Ισχυρός κωδικός' },
}

describe.each(trees(PasswordStrengthMeter, WebsidePasswordStrengthMeter))('$tree Form/PasswordStrengthMeter', ({ tree, C }) => {
  const mountMeter = (password: string) => mountSuspended(C, { route: false, props: { password } })

  it.each([
    { password: 'abc', score: 1, color: 'error', label: 'weak' },
    { password: 'abcdefgh', score: 2, color: 'error', label: 'weak' },
    { password: 'abcdefg1', score: 3, color: 'warning', label: 'medium' },
    { password: 'Abcdefg1', score: 4, color: 'success', label: 'strong' },
    // Seven characters miss only the length rule.
    { password: 'Abcdef1', score: 3, color: 'warning', label: 'medium' },
    { password: '12345678', score: 2, color: 'error', label: 'weak' },
    { password: 'ABCDEFGH', score: 2, color: 'error', label: 'weak' },
    // Greek letters are letters: [a-z] never matched them.
    { password: 'Καλημέρα2024', score: 4, color: 'success', label: 'strong' },
    { password: 'καλημέρα2024', score: 3, color: 'warning', label: 'medium' },
  ] as const)('scores "$password" $score of 4 ($label)', async ({ password, score, color, label }) => {
    const wrapper = await mountMeter(password)

    expect((wrapper.vm as unknown as { score: number }).score).toBe(score)
    expect((wrapper.vm as unknown as { color: string }).color).toBe(color)
    expect(wrapper.find('[role="status"]').text()).toContain(LABEL[tree][label])
  })

  it('announces changes politely', async () => {
    const wrapper = await mountMeter('abc')

    expect(wrapper.find('[role="status"]').attributes('aria-live')).toBe('polite')
  })

  it('renders nothing before anything is typed', async () => {
    const wrapper = await mountMeter('')

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it.runIf(tree === 'default')('says the rubric beside the verdict', async () => {
    const wrapper = await mountMeter('abc')

    expect(wrapper.find('[role="status"] p').text()).toBe('Αδύναμος · 8+ χαρακτήρες, ένας αριθμός, κεφαλαία και πεζά')
  })

  it.runIf(tree === 'webside')('lists each requirement and which are met', async () => {
    const wrapper = await mountMeter('abcdefg1')

    expect(wrapper.findAll('li').map(item => [item.text(), item.classes().includes('text-success')])).toEqual([
      ['Τουλάχιστον 8 χαρακτήρες', true],
      ['Τουλάχιστον 1 αριθμός', true],
      ['Τουλάχιστον 1 πεζό γράμμα', true],
      ['Τουλάχιστον 1 κεφαλαίο γράμμα', false],
    ])
  })
})
