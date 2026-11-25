/** A page's og:image and, when the source size is known, the size it is served at. */
export interface OgImage extends Partial<ImageBox> {
  url: string
}

/**
 * The og:image of an uploaded image: the media service's social-card
 * rendition of the stored file (`OG_IMAGE_BOX`, cut with `cover`) and the
 * size it is served at, computed from the file's stored size
 * (`servedCoverSize`). Without a known size (an SVG, a file not measured yet)
 * no size is stated rather than a wrong one. `undefined` without a file.
 */
export function useOgImage() {
  const img = useMediaStreamImage()

  return (path: string | null | undefined, source: SourceImageSize, position?: string): OgImage | undefined => {
    if (!path) return undefined
    return {
      url: img(path, {
        ...OG_IMAGE_BOX,
        fit: 'cover',
        ...(position ? { position } : {}),
        format: 'png',
      }, {
        provider: 'mediaStream',
      }),
      ...servedCoverSize(source, OG_IMAGE_BOX),
    }
  }
}
