import type { MailMessage } from '~/types/auth'

export async function sendMail(msg: MailMessage) {
  const config = useRuntimeConfig().auth

  if (!config.email) {
    throw new Error('Please make sure to configure email option')
  }

  switch (config.email.provider.name) {
    case 'custom':
      return await withCustom(
        config.email.provider.url,
        config.email.provider.authorization,
      )
    case 'sendgrid':
      return await withSendgrid(config.email.provider.apiKey)
    case 'resend':
      return await withResend(config.email.provider.apiKey)
    default:
      throw new Error('invalid-email-provider')
  }

  function withSendgrid(apiKey: string) {
    return $fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      body: {
        personalizations: [
          {
            to: [{ email: msg.to }],
            subject: msg.subject,
          },
        ],
        content: [{ type: 'text/html', value: msg.html }],
        from: { email: config.email?.from },
        reply_to: { email: config.email?.from },
      },
    })
  }

  // https://resend.com/docs/api-reference/emails/send-email
  function withResend(apiKey: string) {
    return $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        from: config.email?.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
      },
    })
  }

  function withCustom(url: string, authorization: string) {
    return $fetch(url, {
      method: 'POST',
      headers: {
        authorization,
      },
      body: {
        ...msg,
        from: config.email?.from,
      },
    })
  }
}
