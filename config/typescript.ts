export const typescript = {
  strict: true,
  typeCheck: false, // Until vue-tsc is fixed
  builder: 'vite' as 'vite' | 'webpack' | 'shared' | false | undefined,
}
