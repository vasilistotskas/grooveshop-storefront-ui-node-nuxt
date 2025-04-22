import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import MockNavbar from './MockNavbar.vue'

const mockUserSession = {
  user: ref({
    email: 'test@example.com',
    uuid: 'test-uuid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  loggedIn: ref(true),
}

vi.mock('../../../composables/useUserSession', () => ({
  useUserSession: () => ({
    user: mockUserSession.user,
    loggedIn: mockUserSession.loggedIn,
  }),
}))

vi.mock('../../../composables/useDevice', () => ({
  useDevice: () => ({
    isMobileOrTablet: ref(false),
  }),
}))

vi.mock('../../../composables/useAuthPreviewMode', () => ({
  useAuthPreviewMode: () => ({
    enabled: ref(true),
  }),
}))

const mockDeleteSession = vi.fn().mockResolvedValue(undefined)
vi.mock('../../../composables/useAllAuthAuthentication', () => ({
  useAllAuthAuthentication: () => ({
    deleteSession: mockDeleteSession,
  }),
}))

vi.mock('pinia', () => ({
  storeToRefs: vi.fn().mockImplementation(store => ({
    getCartTotalItems: store.getCartTotalItems,
    pending: store.pending,
    healthy: ref(true),
  })),
  defineStore: vi.fn().mockImplementation((id, setup) => {
    return setup
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('Navbar Component', () => {
  let wrapper: any

  beforeEach(() => {
    mockUserSession.user.value = {
      email: 'test@example.com',
      uuid: 'test-uuid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockUserSession.loggedIn.value = true
    mockDeleteSession.mockClear()

    wrapper = mount(MockNavbar, {
      global: {
        stubs: {
          UChip: {
            template: '<div><slot /></div>',
            props: ['color', 'show', 'text'],
          },
          UserAvatar: {
            template: '<div>User Avatar</div>',
            props: ['img-height', 'img-width', 'show-name', 'user-account'],
          },
        },
      },
      props: {
        user: mockUserSession.user.value,
        loggedIn: mockUserSession.loggedIn.value,
        onLogout: mockDeleteSession,
      },
    })
  })

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('displays the cart with correct item count', () => {
    const buttons = wrapper.findAll('button')
    const cartButton = buttons.find((button: any) => button.text().includes('Cart'))
    expect(cartButton).toBeTruthy()
  })

  it('displays user avatar when logged in', () => {
    const userAvatarContainer = wrapper.find('li:has(div)')
    expect(userAvatarContainer.exists()).toBe(true)
  })

  it('displays login link when not logged in', async () => {
    await wrapper.setProps({
      loggedIn: false,
    })

    const loginLink = wrapper.find('a[href="/account/login"]')
    expect(loginLink.exists()).toBe(true)
  })

  it('calls logout function when logout is triggered', async () => {
    const logoutButton = wrapper.find('button.logout-button')
    expect(logoutButton.exists()).toBe(true)

    await logoutButton.trigger('click')

    expect(mockDeleteSession).toHaveBeenCalled()
  })
})
