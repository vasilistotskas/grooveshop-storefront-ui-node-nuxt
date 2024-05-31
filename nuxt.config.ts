import { app } from './config/app'
import { build } from './config/build'
import { cookieControl } from './config/cookie'
import { css } from './config/css'
import { delayHydration } from './config/delay-hydration'
import { device } from './config/device'
import { devtools } from './config/devtools'
import { experimental } from './config/experimental'
import { htmlValidator } from './config/html-validator'
import { i18n } from './config/i18n'
import { image } from './config/image'
import { imports } from './config/imports'
import { linkChecker } from './config/link-checker'
import { modules } from './config/modules'
import { nitro } from './config/nitro'
import { pinia } from './config/pinia'
import { plugins } from './config/plugins'
import { pwa } from './config/pwa'
import { robots } from './config/robots'
import { routeRules } from './config/route-rules'
import { runtimeConfig } from './config/runtime-config'
import { schemaOrg } from './config/schema-org'
import { site } from './config/site'
import { sitemap } from './config/sitemap'
import { tailwindcss } from './config/tailwindcss'
import { typescript } from './config/typescript'
import { veeValidate } from './config/vee-validate'
import { vite } from './config/vite'
import { vue } from './config/vue'
import { eslint } from './config/eslint'
import { ogImage } from './config/og-image'
import { colorMode } from './config/color-mode'

export default defineNuxtConfig({
  ssr: true,
  debug: false,
  sourcemap: true,
  telemetry: false,
  site,
  modules,
  routeRules,
  plugins,
  build,
  imports,
  experimental,
  devtools,
  typescript,
  tailwindcss,
  i18n,
  css,
  runtimeConfig,
  cookieControl,
  vue,
  pinia,
  vite,
  nitro,
  eslint,
  app,
  image,
  pwa,
  schemaOrg,
  sitemap,
  linkChecker,
  robots,
  htmlValidator,
  veeValidate,
  delayHydration,
  device,
  ogImage,
  colorMode,
})
