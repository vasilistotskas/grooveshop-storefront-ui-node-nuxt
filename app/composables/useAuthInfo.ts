export default function () {
  const auth = useState<AllAuthResponse | AllAuthResponseError>('auth-state')
  console.info('Auth state:', auth.value)
  return authInfo(auth.value)
}
