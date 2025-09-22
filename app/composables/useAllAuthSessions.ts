const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function getSessions() {
    return $fetch(`${API_BASE_URL}/sessions`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function deleteSession(body: SessionsDeleteBody) {
    return $fetch(`${API_BASE_URL}/sessions`, {
      method: 'DELETE',
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  return {
    getSessions,
    deleteSession,
  }
}
