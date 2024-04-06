type Mode = 'init' | 'mount' | 'manual' | false

export const delayHydration = {
  mode: 'init' as Mode,
  debug: process.env.NODE_ENV === 'development',
}
