import { afterEach, describe, it, expect, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'

/**
 * Who opens a header menu's panels. The handlers sit on an element around
 * the menu, which hydrates with the page; the lazy menu itself may not have
 * hydrated yet. So the menu here is plain markup with the marks
 * `withDropdownToggles` puts on a section's name and button, and no Reka at
 * all: exactly the server's HTML before the menu hydrates.
 */
async function mountMenu() {
  const open = ref<string | undefined>()
  // A listener of the button's own, standing for Reka's trigger handler.
  const triggerClick = vi.fn()
  let onEscapeKeyDown: (event: KeyboardEvent) => void = () => {}
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      const panels = useMenuPanels(open)
      onEscapeKeyDown = panels.onEscapeKeyDown
      return () => h('div', {
        onPointermove: panels.onPointermove,
        onPointerleave: panels.onPointerleave,
        onPointerdown: panels.onPointerdown,
        onPointerup: panels.onPointerup,
        onClickCapture: panels.onClickCapture,
      }, [
        h('a', { 'href': '/products', 'data-menu-section': 'products' }, 'Κατάστημα'),
        h('button', { 'type': 'button', 'data-menu-section': 'products', 'data-menu-toggle': '', 'onClick': triggerClick }, [h('span', 'Μενού: Κατάστημα')]),
        h('button', { 'type': 'button', 'data-menu-section': 'blog', 'data-menu-toggle': '', 'class': 'blog' }, 'Μενού: Blog'),
      ])
    },
  }), { route: false, attachTo: document.body })
  return {
    wrapper,
    open,
    triggerClick,
    name: wrapper.get('a'),
    button: wrapper.get('button'),
    blog: wrapper.get('button.blog'),
    escape: () => onEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })),
  }
}

const touch = { pointerType: 'touch' }
const mouse = { pointerType: 'mouse' }

describe('useMenuPanels', () => {
  it('opens and closes a section\'s panel on a click of its button, one toggle each', async () => {
    const { open, button, triggerClick } = await mountMenu()

    await button.trigger('click')
    expect(open.value).toBe('products')

    await button.trigger('click')
    expect(open.value).toBe('')
    // Reka's trigger never sees it, so it cannot toggle it back.
    expect(triggerClick).not.toHaveBeenCalled()
  })

  // Tab to the arrow, then Enter, as the first thing after a page load: the
  // button's own click (`detail` 0) reaches the handler, hydrated menu or not.
  it('opens on the first Enter or Space on the button', async () => {
    const { open, button } = await mountMenu()

    button.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }))

    expect(open.value).toBe('products')
  })

  it('opens on the first tap of the button, once, whether its click follows or not', async () => {
    const { open, button } = await mountMenu()

    await button.find('span').trigger('pointerdown', touch)
    await button.find('span').trigger('pointerup', touch)
    expect(open.value).toBe('products')

    // The tap's own click, if the browser still sends it, toggles nothing.
    await button.trigger('click')
    expect(open.value).toBe('products')
  })

  it('leaves a tap on the name to its link', async () => {
    const { wrapper, open, name } = await mountMenu()
    const followed = vi.fn((event: Event) => event.preventDefault())
    wrapper.element.parentElement!.addEventListener('click', followed)

    await name.trigger('pointerdown', touch)
    await name.trigger('pointerup', touch)
    await name.trigger('click')

    expect(open.value).toBeUndefined()
    expect(followed).toHaveBeenCalledTimes(1)
    wrapper.element.parentElement!.removeEventListener('click', followed)
  })

  // Reka's trigger guards, ported with its timings (reka-ui 2.11,
  // `NavigationMenuTrigger`): its hover is off on these menus, so ours
  // must keep a mouse click from fighting the hover.
  describe('the mouse and a click', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('leaves open a panel the mouse opened less than 300ms before the click on its button', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { open, name, button } = await mountMenu()

      await name.trigger('pointermove', mouse)
      await vi.advanceTimersByTimeAsync(299)
      await button.trigger('click')
      expect(open.value).toBe('products')

      // From 300ms on, a click is the visitor's own: it closes.
      await vi.advanceTimersByTimeAsync(1)
      await button.trigger('click')
      expect(open.value).toBe('')
    })

    it('ends that window when the mouse leaves the section', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { wrapper, open, name, button } = await mountMenu()

      await name.trigger('pointermove', mouse)
      await wrapper.trigger('pointermove', mouse)
      await button.trigger('click')

      expect(open.value).toBe('')
    })

    it('keeps a panel a click closed shut under the mouse until the mouse has left the section and come back', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { wrapper, open, name, button } = await mountMenu()
      await name.trigger('pointermove', mouse)
      await vi.advanceTimersByTimeAsync(300)

      await button.trigger('click')
      expect(open.value).toBe('')
      await button.trigger('pointermove', mouse)
      await name.trigger('pointermove', mouse)
      expect(open.value).toBe('')

      await wrapper.trigger('pointermove', mouse)
      await name.trigger('pointermove', mouse)
      expect(open.value).toBe('products')
    })

    it('keeps a panel Escape closed shut under the mouse until the mouse has left and come back', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { wrapper, open, name, escape } = await mountMenu()
      await name.trigger('pointermove', mouse)
      expect(open.value).toBe('products')
      // Past the click guard, so only Escape's own guard holds it shut.
      await vi.advanceTimersByTimeAsync(300)

      escape()
      expect(open.value).toBe('')
      await name.trigger('pointermove', mouse)
      expect(open.value).toBe('')

      await wrapper.trigger('pointerleave', mouse)
      await name.trigger('pointermove', mouse)
      expect(open.value).toBe('products')
    })
  })

  it('opens nothing for a touch that went down elsewhere and was lifted on the button', async () => {
    const { open, name, button, blog } = await mountMenu()

    await name.trigger('pointerdown', touch)
    await button.trigger('pointerup', touch)
    expect(open.value).toBeUndefined()

    // Down on one section's button, up on another's: no tap of either.
    await blog.trigger('pointerdown', touch)
    await button.trigger('pointerup', touch)
    expect(open.value).toBeUndefined()
  })
})
