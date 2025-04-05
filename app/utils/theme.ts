import { createDefu } from 'defu'

export const mergeClasses = createDefu((obj, key, value) => {
  if (typeof obj[key] === 'string' && typeof value === 'string') {
    obj[key] = (`${obj[key]} ${value}`.trim()) as any
    return true
  }
  return false
})
