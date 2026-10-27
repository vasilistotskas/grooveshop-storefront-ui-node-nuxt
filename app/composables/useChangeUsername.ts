/**
 * Change the signed-in shopper's username: its own request (Django
 * rejects a taken one with 409, "Username already taken.", and a
 * malformed one with 400), shared by the settings form and the account
 * banner's inline edit (`User/Account/Info`).
 *
 * `changeUsername` resolves Django's answer once the name is saved, and
 * the session is read again so every reader shows it; a refusal is one
 * toast with Django's own reason behind `failureTitle`, and resolves
 * `null`.
 */
export function useChangeUsername() {
  const { fetch } = useUserSession()
  const { notify } = useApiError()

  async function changeUsername(
    userId: number,
    username: string,
    failureTitle: string,
  ): Promise<ChangeUserAccountUsernameResponse | null> {
    try {
      const response = await $api<ChangeUserAccountUsernameResponse>(`/api/user/account/${userId}/change-username`, {
        method: 'POST',
        body: { username },
      })
      await fetch()
      return response
    }
    catch (error) {
      notify('settings:username', error, { title: failureTitle })
      return null
    }
  }

  return { changeUsername }
}
