export type ConfigResponse = {
  status: number
  data: {
    account: {
      authentication_method: string
    }
    socialaccount?: {
      providers: {
        id: string
        name: string
        flows: string[]
        client_id?: string
      }[]
    }
    mfa?: {
      supported_types: string[]
    }
    usersessions?: {
      track_activity: boolean
    }
  }
}

export type LoginBody = {
  email: string
  password: string
}

export type LoginResponse = {
  status: number
  data: {
    user: {
      id: number
      display: string
      email: string
      username: string
      has_usable_password: boolean
    }
    methods: {
      at: any
      email: string
      method: string
    }[]
  }
  meta: {
    is_authenticated: boolean
    session_token: string
    access_token?: string
  }
}

export type TwoFaAuthenticateBody = {
  code: string
}

export type NotAuthenticatedResponse = {
  status: 401
  data: {
    flows: {
      id: 'verify_email' | 'login' | 'login_by_code' | 'signup' | 'provider_redirect' | 'provider_signup' | 'provider_token' | 'reauthenticate' | 'mfa_reauthenticate' | 'mfa_authenticate'
      providers?: string[]
      is_pending?: boolean
    }[]
    user?: {
      id: number
      display: string
      has_usable_password: boolean
      email: string
      username: string
    }
    methods?: {
      method: 'password' | 'mfa'
      at: number
      email: string
      id?: number
      type?: 'totp'
    }[]
  }
  meta: {
    is_authenticated: false
  }
}

export type InvalidSessionResponse = {
  status: 410
  data: {
    flows: {
      id: 'verify_email' | 'login' | 'login_by_code' | 'signup' | 'provider_redirect' | 'provider_signup' | 'provider_token' | 'reauthenticate' | 'mfa_reauthenticate' | 'mfa_authenticate'
      providers?: string[]
      is_pending?: boolean
    }[]
  }
  meta: {
    is_authenticated: false
  }
}
