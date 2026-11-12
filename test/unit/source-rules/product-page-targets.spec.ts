import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import type { ElementNode } from '../../helpers/sourceText'
import { COMPONENTS, boundAttribute, classesOf, relativeLabel, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * Every control of the product page is a 44px target on a phone, in both
 * designs (the real-browser check, 2026-11-12, measured webside's buy-box
 * favourite at 32x32). happy-dom lays nothing out, so the classes that
 * size them are the contract:
 *
 * - a control in the page's flow takes its real size below `sm`: every
 *   one `max-sm:min-h-11`, and an icon-only one `max-sm:min-w-11` as
 *   well, each checked on its own;
 * - a control floating over a picture (the gallery's zoom and arrows)
 *   keeps its size and takes a 44px hit area from an ::after, so it
 *   covers no more of the picture.
 *
 * A control inside an element hidden below `sm` (the sticky bar's
 * steppers) is not on a phone and is left alone.
 */
const PAGES = [
  'Storefront/ProductDetail.vue',
  'variants/webside/Storefront/ProductDetail.vue',
].map(file => resolve(COMPONENTS, file))

const GALLERIES = [
  'Product/Images.vue',
  'variants/webside/Product/Images.vue',
].map(file => resolve(COMPONENTS, file))

const CONTROLS = new Set([
  'UButton',
  'ButtonProductAddToCart',
  'WebsideButtonProductAddToCart',
  'ButtonProductAddToFavourite',
  'WebsideButtonProductAddToFavourite',
])

// 44px or more: the buy box's add button is 52px (`min-h-13`) to match the stepper beside it.
const PHONE_HEIGHT = /(^|[\s'"`])(?:max-sm:min-h-11|min-h-1[1-3])(?=[\s'"`]|$)/
const PHONE_WIDTH = /(^|[\s'"`])max-sm:min-w-11(?=[\s'"`]|$)/

/** A static or bound attribute of `node` named `name`. */
const hasAttribute = (node: ElementNode, name: string) =>
  node.props.some(prop => (prop.type === 6 && prop.name === name) || boundAttribute(node, name) !== undefined)

/**
 * A control that shows an icon and no words, so nothing but the class
 * makes it 44px wide: no label, no text or element inside, and an icon
 * (a heart, a share arrow) or `icon-only`.
 */
function iconOnly(node: ElementNode) {
  if (hasAttribute(node, 'label')) return false
  // 2 text, 3 comment: anything else inside (an element, an interpolation) is words.
  if (node.children.some(child => (child.type === 2 ? child.content.trim() !== '' : child.type !== 3))) return false
  return hasAttribute(node, 'icon') || hasAttribute(node, 'icon-only') || /AddToFavourite$/.test(node.tag)
}

/** 44px tall on a phone, and 44px wide too when it is an icon alone. */
const sizedForAPhone = (node: ElementNode) =>
  PHONE_HEIGHT.test(classesOf(node)) && (!iconOnly(node) || PHONE_WIDTH.test(classesOf(node)))
const HIDDEN_ON_A_PHONE = (node: ElementNode) => {
  const classes = classesOf(node).split(' ')
  return classes.includes('hidden') && classes.some(name => /^sm:(flex|block|inline|grid)/.test(name))
}

function controls(file: string) {
  const out: Array<{ at: string, sized: boolean }> = []
  walkElements(sfcTemplate(file), (node, ancestors) => {
    if (HIDDEN_ON_A_PHONE(node) || ancestors.some(HIDDEN_ON_A_PHONE)) return false
    const at = `${relativeLabel(COMPONENTS, file)}:${node.loc.start.line} <${node.tag}>`
    if (CONTROLS.has(node.tag)) out.push({ at, sized: sizedForAPhone(node) })
    if (node.tag === 'UInputNumber') {
      for (const part of ['increment', 'decrement']) {
        const bound = boundAttribute(node, part) ?? ''
        out.push({ at: `${at} ${part}`, sized: bound.includes('max-sm:min-h-11') && bound.includes('max-sm:min-w-11') })
      }
    }
    return true
  })
  return out
}

function floatingControls(file: string) {
  const out: Array<{ at: string, sized: boolean }> = []
  walkElements(sfcTemplate(file), (node) => {
    const at = `${relativeLabel(COMPONENTS, file)}:${node.loc.start.line} <${node.tag}>`
    if (node.tag === 'UButton' && node.props.some(prop => prop.type === 6 && prop.name === 'square')) {
      out.push({ at, sized: classesOf(node).includes('after:-inset-2') })
    }
    for (const arrow of ['prev', 'next']) {
      const bound = boundAttribute(node, arrow)
      if (bound !== undefined) out.push({ at: `${at} ${arrow}`, sized: bound.includes('after:-inset-2') })
    }
  })
  return out
}

describe('the product page\'s controls are 44px targets on a phone', () => {
  const found = PAGES.flatMap(controls)

  it('finds both designs\' buy-box controls', () => {
    // Favourites, add to cart (buy box and sticky bar), the steppers, share,
    // the price trend and the alerts: a rule that found none would pass
    // for the wrong reason.
    expect(found.length).toBeGreaterThanOrEqual(15)
  })

  it('sizes each one in the flow to 44px below sm', () => {
    expect(found.filter(control => !control.sized).map(control => control.at)).toEqual([])
  })

  it('gives each control floating over the gallery a 44px hit area', () => {
    const floating = GALLERIES.flatMap(floatingControls)

    expect(floating.length).toBeGreaterThanOrEqual(3)
    expect(floating.filter(control => !control.sized).map(control => control.at)).toEqual([])
  })

  // Nuxt UI's carousel dots are buttons 6px wide, 6px apart: no target a
  // finger can hit. A gallery shows its position with plain marks instead
  // (`Product/Images`: aria-hidden, the position read as words per photo).
  it('draws no gallery position as buttons: no carousel there sets dots', () => {
    const carousels: Array<{ at: string, dots: boolean }> = []
    for (const file of GALLERIES) {
      walkElements(sfcTemplate(file), (node) => {
        if (/^(Lazy)?UCarousel$/.test(node.tag)) carousels.push({ at: `${relativeLabel(COMPONENTS, file)}:${node.loc.start.line}`, dots: hasAttribute(node, 'dots') })
      })
    }

    expect(carousels.length).toBeGreaterThanOrEqual(2)
    expect(carousels.filter(carousel => carousel.dots).map(carousel => carousel.at)).toEqual([])
  })
})
