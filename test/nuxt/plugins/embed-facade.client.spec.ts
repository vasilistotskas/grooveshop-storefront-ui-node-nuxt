import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogContent from '~/components/Blog/BlogContent.vue'
import WebsideBlogContent from '~/components/variants/webside/Blog/BlogContent.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * An embedded player in a post body is a play button until the visitor
 * presses it (`sanitizeRichHtml`); this plugin turns the press into the
 * player. A blog body is never hydrated, so the press reaches nothing but
 * this one document listener — the reason the spec mounts the real bodies
 * of both trees and clicks the real button.
 */
const SHORT
  = '<p><iframe title="YouTube video player" style="display: table; margin-left: auto;" '
    + 'src="https://www.youtube.com/embed/eIiZ-JHL5aw?start=12" width="315" height="560" '
    + 'frameborder="0" allowfullscreen="allowfullscreen"></iframe></p>'

describe.each(trees(BlogContent, WebsideBlogContent))('embed-facade plugin, $tree Blog/BlogContent', ({ C }) => {
  async function render(html = SHORT) {
    return mountSuspended(C, { route: false, attachTo: document.body, props: { html } })
  }

  it('loads no player until the visitor presses play', async () => {
    const wrapper = await render()

    expect(wrapper.find('iframe').exists()).toBe(false)
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe(useNuxtApp().$i18n.t('a11y.play_video'))
  })

  it('draws the poster from the store\'s own media host, never from YouTube', async () => {
    const wrapper = await render()

    const style = wrapper.get('button').attributes('style')
    expect(style).toContain('youtube/eIiZ-JHL5aw/480/360/cover/centre/transparent/0/80.webp')
    expect(style).not.toContain('ytimg')
  })

  it('swaps the button for the privacy-enhanced player, in the same box, playing at once', async () => {
    const wrapper = await render()

    await wrapper.get('button').trigger('click')

    expect(wrapper.find('button').exists()).toBe(false)
    const player = wrapper.get('iframe')
    expect(player.attributes('src')).toBe('https://www.youtube-nocookie.com/embed/eIiZ-JHL5aw?autoplay=1&start=12')
    expect(player.attributes('title')).toBe('YouTube video player')
    expect(player.attributes('style')).toContain('--embed-w: 315px; --embed-h: 560px')
    expect(player.attributes('style')).toContain('display: table; margin-left: auto;')
    expect(player.classes()).toEqual(['rich-embed'])
    expect(player.attributes('allow')).toContain('autoplay')
    expect(document.activeElement).toBe(player.element)
  })

  it('does the same for an embed with no poster: a playlist, and Vimeo', async () => {
    const playlist = await render('<iframe src="https://www.youtube.com/embed/videoseries?list=PL123"></iframe>')
    expect(playlist.find('iframe').exists()).toBe(false)
    await playlist.get('button').trigger('click')
    expect(playlist.get('iframe').attributes('src'))
      .toBe('https://www.youtube-nocookie.com/embed/videoseries?list=PL123&autoplay=1')

    const vimeo = await render('<iframe src="https://player.vimeo.com/video/76979871"></iframe>')
    expect(vimeo.find('iframe').exists()).toBe(false)
    await vimeo.get('button').trigger('click')
    expect(vimeo.get('iframe').attributes('src')).toBe('https://player.vimeo.com/video/76979871?autoplay=1')
  })

  it('ignores a button that only looks like a facade', async () => {
    const wrapper = await render()
    const button = wrapper.get('button')
    button.element.dataset.embedSrc = 'https://evil.example/embed/x'

    await button.trigger('click')

    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(true)
  })
})
