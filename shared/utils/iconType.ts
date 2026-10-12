const ICON_TYPES: Record<string, string> = {
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/**
 * The MIME type an icon file declares, from its extension: the `type`
 * of a `<link rel="icon">` and of a web-manifest icon. A store's
 * favicon is whatever file it points at (`.ico`, `.png`, `.svg`, …),
 * and a declared type that disagrees with the file makes a browser
 * skip it. Undefined for an extension it does not know, so the caller
 * declares no type and the browser sniffs the file.
 */
export function iconMimeType(url: string): string | undefined {
  const path = url.split(/[?#]/, 1)[0] ?? ''
  const file = path.slice(path.lastIndexOf('/') + 1)
  const dot = file.lastIndexOf('.')
  return dot === -1 ? undefined : ICON_TYPES[file.slice(dot + 1).toLowerCase()]
}
