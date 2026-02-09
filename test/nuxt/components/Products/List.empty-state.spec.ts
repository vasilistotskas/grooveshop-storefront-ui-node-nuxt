import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { UEmpty } from '#components'

describe('UEmpty Component - Configuration', () => {
  it('accepts icon prop correctly', () => {
    const wrapper = mount(UEmpty, {
      props: {
        icon: 'i-heroicons-magnifying-glass-minus',
        title: 'No products found',
        description: 'Try adjusting your filters',
      },
    })

    expect(wrapper.props('icon')).toBe('i-heroicons-magnifying-glass-minus')
  })

  it('accepts title and description props', () => {
    const wrapper = mount(UEmpty, {
      props: {
        icon: 'i-heroicons-magnifying-glass-minus',
        title: 'No products found',
        description: 'Try adjusting your filters',
      },
    })

    expect(wrapper.props('title')).toBe('No products found')
    expect(wrapper.props('description')).toBe('Try adjusting your filters')
  })

  it('accepts actions array with button configuration', () => {
    const mockOnClick = () => {}
    const wrapper = mount(UEmpty, {
      props: {
        icon: 'i-heroicons-magnifying-glass-minus',
        title: 'No products found',
        description: 'Try adjusting your filters',
        actions: [
          {
            label: 'Clear filters',
            size: 'xl',
            color: 'primary',
            variant: 'solid',
            leadingIcon: 'i-heroicons-arrow-path',
            onClick: mockOnClick,
          },
        ],
      },
    })

    const actions = wrapper.props('actions')
    expect(actions).toBeDefined()
    expect(Array.isArray(actions)).toBe(true)
    if (actions) {
      expect(actions.length).toBe(1)
      expect(actions[0]?.label).toBe('Clear filters')
      expect(actions[0]?.size).toBe('xl')
      expect(actions[0]?.color).toBe('primary')
      expect(actions[0]?.variant).toBe('solid')
      expect(actions[0]?.leadingIcon).toBe('i-heroicons-arrow-path')
      expect(actions[0]?.onClick).toBe(mockOnClick)
    }
  })

  it('renders with all required props', () => {
    const wrapper = mount(UEmpty, {
      props: {
        icon: 'i-heroicons-magnifying-glass-minus',
        title: 'No products found',
        description: 'Try adjusting your filters',
        actions: [
          {
            label: 'Clear filters',
            size: 'xl',
            color: 'primary',
            variant: 'solid',
            leadingIcon: 'i-heroicons-arrow-path',
            onClick: () => {},
          },
        ],
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toBeTruthy()
  })
})

/**
 * Property Test Simulation: UEmpty Props Consistency
 *
 * For any configuration of the UEmpty component, it should accept
 * and properly handle the icon, title, description, and actions props.
 */
describe('UEmpty Props Consistency', () => {
  const testCases = [
    {
      icon: 'i-heroicons-magnifying-glass-minus',
      title: 'No products found',
      description: 'Try adjusting your filters',
    },
    {
      icon: 'i-heroicons-inbox',
      title: 'Empty state',
      description: 'No items to display',
    },
    {
      icon: 'i-heroicons-folder-open',
      title: 'Nothing here',
      description: 'Start by adding items',
    },
  ]

  testCases.forEach(({ icon, title, description }) => {
    it(`handles props correctly for "${title}"`, () => {
      const wrapper = mount(UEmpty, {
        props: {
          icon,
          title,
          description,
          actions: [
            {
              label: 'Action',
              onClick: () => {},
            },
          ],
        },
      })

      expect(wrapper.props('icon')).toBe(icon)
      expect(wrapper.props('title')).toBe(title)
      expect(wrapper.props('description')).toBe(description)
      expect(wrapper.exists()).toBe(true)
    })
  })
})

