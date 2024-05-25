const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function getSessions() {
    return useFetch(`${API_BASE_URL}/sessions`, {
      method: 'GET',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function deleteSession() {
    return await $fetch(`${API_BASE_URL}/sessions`, {
      method: 'DELETE',
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
