import type { Notification } from '~/types/notification'

const API_BASE_URL = '/api/notification/ids'

export default function () {
  async function getNotifications(ids: number[]) {
    return $fetch<Notification[]>(API_BASE_URL, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: { ids },
    })
  }

  return {
    getNotifications,
  }
}
