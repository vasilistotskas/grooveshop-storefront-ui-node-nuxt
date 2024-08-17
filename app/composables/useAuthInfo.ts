import type { AllAuthResponse, AllAuthResponseError } from '~/types/all-auth'

export default function () {
  const auth = useState<AllAuthResponse | AllAuthResponseError>('authState')
  return authInfo(auth.value)
}
