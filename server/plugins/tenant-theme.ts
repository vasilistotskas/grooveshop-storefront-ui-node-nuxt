function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const tenant = event.context.tenant as TenantConfig | undefined
    if (!tenant) return

    const vars: string[] = []

    if (tenant.accentHex && isValidHex(tenant.accentHex)) {
      vars.push(`--ui-secondary: ${tenant.accentHex}`)
      vars.push(`--ui-liked: ${tenant.accentHex}`)
    }
    if (tenant.successHex && isValidHex(tenant.successHex)) {
      vars.push(`--ui-success: ${tenant.successHex}`)
    }
    if (tenant.warningHex && isValidHex(tenant.warningHex)) {
      vars.push(`--ui-warning: ${tenant.warningHex}`)
    }
    if (tenant.errorHex && isValidHex(tenant.errorHex)) {
      vars.push(`--ui-error: ${tenant.errorHex}`)
    }
    if (tenant.infoHex && isValidHex(tenant.infoHex)) {
      vars.push(`--ui-info: ${tenant.infoHex}`)
    }

    if (vars.length === 0) return

    const rootVars = vars.join('; ')
    const style = `<style id="tenant-theme">:root { ${rootVars} } .dark { ${rootVars} }</style>`
    html.head.push(style)
  })
})
