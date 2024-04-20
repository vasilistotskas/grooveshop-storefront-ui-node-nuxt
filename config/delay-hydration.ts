type Mode = 'init' | 'mount' | 'manual' | false

export const delayHydration = {
  mode: 'mount' as Mode,
  debug: import.meta.env.NODE_ENV === 'development',
}
