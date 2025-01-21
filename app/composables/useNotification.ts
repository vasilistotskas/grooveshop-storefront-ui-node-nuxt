const API_BASE_URL = '/api/notification/ids'

export default function () {
  async function getNotifications(ids: number[]) {
    return $fetch<ZNotification[]>(API_BASE_URL, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: { ids },
    })
  }

  return {
    getNotifications,
  }
}
