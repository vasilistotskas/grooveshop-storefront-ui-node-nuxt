/**
 * Whether an image source is served by the Media Stream service rather than by
 * IPX: a tenant's uploaded media (`media/<schema>/uploads/...`, the path Django's
 * `image_to_media_path` produces) or its static images. IPX serves the app's
 * `public/` folder only, so these 404 through it. `ImgWithFallback` and every
 * component that draws with `NuxtImg` directly pick the provider by this.
 */
export function isMediaStreamSrc(src: string): boolean {
  return /^\/?media\/[^/]+\/uploads(\/|$)/.test(src) || src.startsWith('static/images') || src.startsWith('/static/images')
}
