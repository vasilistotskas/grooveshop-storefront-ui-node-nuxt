const API_BASE_URL = '/api/_allauth/app/v1'

export default function () {
  async function getConfig() {
    return useFetch(`${API_BASE_URL}/config`, {
      method: 'GET',
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
