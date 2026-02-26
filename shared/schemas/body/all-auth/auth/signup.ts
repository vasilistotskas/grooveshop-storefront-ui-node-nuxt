import * as z from 'zod'

// ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
// email is required; username is not a signup field.
// Password confirmation (password2) is validated client-side in the form
// before this body is sent — the server proxy only needs to confirm a
// password string was provided.
export const ZodSignupBody = z.object({
  email: z.string().email().describe('The email address.'),
  password: z.string().describe('The password.'),
})
