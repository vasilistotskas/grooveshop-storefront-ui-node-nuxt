/**
 * Asks the browser for a credential from the request options allauth sent
 * (`request_options.publicKey`, WebAuthn's JSON form) and returns it in
 * the JSON form allauth takes back. Must run from the shopper's click:
 * Safari refuses a WebAuthn request without a user gesture.
 *
 * allauth's document leaves the options an open object, so they arrive as
 * `unknown`; the browser validates them itself and throws on a bad one.
 */
export async function getWebAuthnCredential(publicKeyJson: unknown) {
  if (!publicKeyJson) throw new Error('allauth sent no request options')
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(publicKeyJson as PublicKeyCredentialRequestOptionsJSON)
  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
  return { ...credential.toJSON() }
}

/**
 * The same for registering a credential: the creation options allauth sent
 * (`creation_options.publicKey` or, at passkey signup, `request_options.publicKey`)
 * to the credential in the JSON form allauth takes back.
 */
export async function createWebAuthnCredential(publicKeyJson: unknown) {
  if (!publicKeyJson) throw new Error('allauth sent no creation options')
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(publicKeyJson as PublicKeyCredentialCreationOptionsJSON)
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential
  return { ...credential.toJSON() }
}
