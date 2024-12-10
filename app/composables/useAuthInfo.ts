export default function () {
  const auth = useState<AllAuthResponse | AllAuthResponseError>('auth-state')
  return authInfo(auth.value)
}
