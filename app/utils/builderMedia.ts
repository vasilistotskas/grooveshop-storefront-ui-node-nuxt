/**
 * What the editor calls an image of the media library: the name of its file.
 * An asset holds a path (`media/<store>/uploads/<folder>/<file>`) and no name
 * of its own, and a path is what media-stream serves, not what a person reads.
 */
export function builderMediaName(path: string): string {
  return decodeURIComponent(path.split('/').at(-1) ?? path)
}
