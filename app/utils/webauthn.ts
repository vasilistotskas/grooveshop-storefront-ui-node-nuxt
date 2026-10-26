/**
 * Asks the browser for a credential from the request options allauth sent
 * (`request_options.publicKey`, WebAuthn's JSON form) and returns it in
 * the JSON form allauth takes back. Must run from the shopper's click:
 * Safari refuses a WebAuthn request without a user gesture.
 */
export async function getWebAuthnCredential(
  publicKeyJson: Parameters<typeof PublicKeyCredential.parseRequestOptionsFromJSON>[0] | undefined,
) {
  if (!publicKeyJson) throw new Error('allauth sent no request options')
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(publicKeyJson)
  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
  return credential.toJSON()
}
