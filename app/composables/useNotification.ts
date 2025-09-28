const API_BASE_URL = '/api/notification/ids'

export default function () {
  async function getNotifications(ids: number[], seen: boolean = false) {
    return $fetch(API_BASE_URL, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: { ids },
      query: {
        seen,
      },
    })
  }

  return {
    getNotifications,
  }
}
