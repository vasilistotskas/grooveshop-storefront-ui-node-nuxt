const API_BASE_URL = '/api/_allauth/app/v1'

export default function () {
  async function getConfig() {
    return $fetch(`${API_BASE_URL}/config`, {
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

  return {
    getConfig,
  }
}
