import type { NotificationUserBody } from '~/types/notification/user'

const API_BASE_URL = '/api/notification/user'

export default function () {
  async function getNotifications(userId: number, seen: boolean = false) {
    return $fetch(`/api/user/account/${userId}/notifications`, {
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        seen,
      },
    })
  }

  async function getNotification(id: number) {
    return $fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers: useRequestHeaders(),
    })
  }

  async function updateNotification(id: number, body: NotificationUserBody) {
    return $fetch(`${API_BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: useRequestHeaders(),
      body,
    })
  }

  async function deleteNotification(id: number) {
    return $fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
    })
  }

  async function markAllSeen() {
    return $fetch(`${API_BASE_URL}/mark-all-as-seen`, {
      method: 'POST',
      headers: useRequestHeaders(),
    })
  }

  async function markAllUnseen() {
    return $fetch(`${API_BASE_URL}/mark-all-as-unseen`, {
      method: 'POST',
      headers: useRequestHeaders(),
    })
  }

  async function markAsSeen(notificationUserIds: number[]) {
    return $fetch(`${API_BASE_URL}/mark-as-seen`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: { notificationUserIds },
    })
  }

  async function markAsUnseen(notificationUserIds: number[]) {
    return $fetch(`${API_BASE_URL}/mark-as-unseen`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: { notificationUserIds },
    })
  }

  async function getUnseenCount() {
    return $fetch(`${API_BASE_URL}/unseen-count`, {
      method: 'GET',
      headers: useRequestHeaders(),
    })
  }

  return {
    getNotifications,
    getNotification,
    updateNotification,
    deleteNotification,
    markAllSeen,
    markAllUnseen,
    markAsSeen,
    markAsUnseen,
    getUnseenCount,
  }
}
