export const typescript = {
  strict: true,
  typeCheck: true, // Until vue-tsc is fixed
  builder: 'vite' as 'vite' | 'webpack' | 'shared' | false | undefined,
}
