export default function () {
  const auth = useState<AllAuthResponse | AllAuthResponseError>('auth-state')
  console.debug('Auth state:', auth.value)
  return authInfo(auth.value)
}
