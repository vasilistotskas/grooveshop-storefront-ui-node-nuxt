/** A width and height in pixels. */
export interface ImageBox {
  width: number
  height: number
}

/**
 * A source image's displayed size as Django reports it (`mainImageWidth` /
 * `mainImageHeight`: EXIF orientation applied). Either is null for an SVG or
 * a file not measured yet.
 */
export interface SourceImageSize {
  width: number | null | undefined
  height: number | null | undefined
}

/**
 * The size the media service serves a `fit: 'cover'` rendition of *source*
 * at when asked for *box*, or `undefined` when the source size is unknown (no
 * size is truer than a wrong one).
 *
 * Only for a contract size (`renditions.sizes.contract` in
 * grooveshop-media-stream `src/MediaStream/common/utils/config-schema.util.ts`:
 * the og image and the Article's three shapes), which the service answers
 * exactly instead of snapping it up its width ladder.
 *
 * The media service never enlarges a source: it scales the box down until it
 * fits inside the source, keeping its aspect. This repeats `boxWithinSource`
 * in grooveshop-media-stream
 * `src/MediaStream/Processing/jobs/webp-image-manipulation.job.ts` for `cover`,
 * expression for expression and in the same order of evaluation:
 * `Math.round(height * (source.width / width))` is 247 for a 440 wide source
 * at 1200x675, because `675 * (440 / 1200)` is 247.49999999999997 in a double.
 * A change there changes this, in the same release.
 */
export function servedCoverSize(source: SourceImageSize, box: ImageBox): ImageBox | undefined {
  const { width: sourceWidth, height: sourceHeight } = source
  if (!sourceWidth || !sourceHeight) return undefined
  const { width, height } = box
  const widthRatio = sourceWidth / width
  const heightRatio = sourceHeight / height
  if (Math.min(widthRatio, heightRatio) >= 1) return { width, height }
  return widthRatio <= heightRatio
    ? {
        width: sourceWidth,
        height: Math.min(sourceHeight, Math.max(1, Math.round(height * widthRatio))),
      }
    : {
        width: Math.min(sourceWidth, Math.max(1, Math.round(width * heightRatio))),
        height: sourceHeight,
      }
}
