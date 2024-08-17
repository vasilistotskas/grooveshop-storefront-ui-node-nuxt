import type { SessionsDeleteBody } from '~/types/all-auth'

const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function getSessions() {
    return $fetch(`${API_BASE_URL}/sessions`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function deleteSession(body: SessionsDeleteBody) {
    return await $fetch(`${API_BASE_URL}/sessions`, {
      method: 'DELETE',
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  return {
    getSessions,
    deleteSession,
  }
}
