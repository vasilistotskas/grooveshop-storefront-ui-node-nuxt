import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const toast = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }))
mockNuxtImport('useToast', () => () => toast)

const failure = (body: Record<string, unknown>) => Object.assign(new Error('x'), { status: 400, data: body })
const fieldBody = (field: string) => ({ code: 'unique', fields: { [field]: [{ message: 'Υπάρχει ήδη.', code: 'unique' }] } })

function setup(fields: string[]) {
  const form = { setErrors: vi.fn(), getErrors: vi.fn(() => []) }
  const { reportFailure } = useApiFormErrors(ref(form), { fields: () => fields })
  return { form, reportFailure }
}

describe('useApiFormErrors().reportFailure', () => {
  it('puts a field error under its input and does not toast it', async () => {
    const { form, reportFailure } = setup(['email', 'phone'])

    await reportFailure('account:update', failure(fieldBody('email')), { title: 'Σφάλμα' })

    expect(form.setErrors).toHaveBeenCalledWith([{ name: 'email', message: 'Υπάρχει ήδη.' }])
    expect(toast.add).not.toHaveBeenCalled()
  })

  it('toasts a refusal of the whole action, which names no field', async () => {
    const { form, reportFailure } = setup(['email'])

    await reportFailure('account:update', failure({ detail: 'Δεν επιτρέπεται.', code: 'forbidden' }), { title: 'Σφάλμα' })

    expect(form.setErrors).not.toHaveBeenCalled()
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'account:update', description: 'Δεν επιτρέπεται.' }))
  })

  it('toasts an error on a field the form does not render, which Nuxt UI would drop', async () => {
    const { form, reportFailure } = setup(['email'])

    await reportFailure('account:update', failure(fieldBody('taxId')), { title: 'Σφάλμα' })

    expect(form.setErrors).not.toHaveBeenCalled()
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ description: 'Υπάρχει ήδη.' }))
  })

  it('puts a nested row error under the input that carries its full path', async () => {
    const { form, reportFailure } = setup(['items.1.quantity'])
    const body = { code: 'invalid', fields: { items: { 1: { quantity: [{ message: 'Πολύ μικρή.', code: 'min_value' }] } } } }

    await reportFailure('cart:update', failure(body), { title: 'Σφάλμα' })

    expect(form.setErrors).toHaveBeenCalledWith([{ name: 'items.1.quantity', message: 'Πολύ μικρή.' }])
    expect(toast.add).not.toHaveBeenCalled()
  })

  it('toasts a nested row error when the form has no input of that path', async () => {
    const { form, reportFailure } = setup(['items'])
    const body = { code: 'invalid', fields: { items: { 1: { quantity: [{ message: 'Πολύ μικρή.', code: 'min_value' }] } } } }

    await reportFailure('cart:update', failure(body), { title: 'Σφάλμα' })

    expect(form.setErrors).not.toHaveBeenCalled()
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ description: 'Πολύ μικρή.' }))
  })

  it('does both when the body has fields the form has and fields it lacks', async () => {
    const { form, reportFailure } = setup(['email'])
    const body = { fields: { email: [{ message: 'Υπάρχει ήδη.', code: 'unique' }], taxId: [{ message: 'Άκυρο.', code: 'invalid' }] } }

    await reportFailure('account:update', failure(body), { title: 'Σφάλμα' })

    expect(form.setErrors).toHaveBeenCalledWith([{ name: 'email', message: 'Υπάρχει ήδη.' }])
    expect(toast.add).toHaveBeenCalledTimes(1)
  })
})
