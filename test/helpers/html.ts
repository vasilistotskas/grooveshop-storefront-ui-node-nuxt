import { Window } from 'happy-dom'

/**
 * A page's markup as a reader sees it: the document with its `<script>` and
 * `<style>` elements removed. The page payload and the theme hold the data
 * whatever the page draws, so a check of what the page DRAWS reads this: on
 * the raw HTML it would pass for a page whose markup lacks what it looks
 * for, because the payload carries the same text. Parsed by happy-dom (a
 * script is never run), not stripped with a regular expression, which cannot
 * tell an element from text that looks like one.
 */
export function markupWithoutScriptsAndStyles(html: string): string {
  const window = new Window()
  try {
    window.document.write(html)
    for (const element of window.document.querySelectorAll('script, style')) element.remove()
    return window.document.documentElement.outerHTML
  }
  finally {
    void window.happyDOM.close()
  }
}
