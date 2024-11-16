export default function () {
  const auth = useState<AllAuthResponse | AllAuthResponseError>('authState')
  return authInfo(auth.value)
}
