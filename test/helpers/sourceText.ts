/**
 * Helpers for specs that assert on SOURCE TEXT rather than behaviour.
 *
 * A rule read off the source fires on its own documentation: the two
 * specs using this both explain, in a comment, the exact pattern they
 * forbid — and matched themselves. Blanking comment bodies while
 * keeping the line count intact keeps reported line numbers honest.
 */

/** Replace every character of `match` except newlines with a space. */
const blank = (match: string) => match.replace(/[^\r\n]/g, ' ')

/**
 * Blank out HTML, block and line comments, preserving line numbers.
 *
 * The line-comment pattern requires a non-`:` character before `//` so
 * that a `https://` inside a string survives.
 */
export function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\r\n]*/g, match => match[0] + blank(match.slice(1)))
}
