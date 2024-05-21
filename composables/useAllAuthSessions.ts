const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function sessions() {
    return await $fetch(`${API_BASE_URL}/sessions`, {
      method: 'GET',
    })
  }

  async function deleteSession() {
    return await $fetch(`${API_BASE_URL}/sessions`, {
      method: 'DELETE',
    })
  }

  return {
    sessions,
    deleteSession,
  }
}
