/** @type {import("pm2").Config} */
const config = {
  apps: [
    {
      name: '@vasilistotskas/grooveshop-storefront-ui-node-nuxt',
      port: '3000',
      exec_mode: 'cluster',
      instances: 'max',
      script: './.output/server/index.mjs',
    },
  ],
}

export default config
