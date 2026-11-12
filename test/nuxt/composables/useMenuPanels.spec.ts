import { describe, it, expect, vi } from 'vitest'
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
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      const panels = useMenuPanels(open)
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
  return { wrapper, open, triggerClick, name: wrapper.get('a'), button: wrapper.get('button'), blog: wrapper.get('button.blog') }
}

const touch = { pointerType: 'touch' }

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
