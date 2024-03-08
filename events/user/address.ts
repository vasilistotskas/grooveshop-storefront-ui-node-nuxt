export type UserAddressPayload = {
  action: 'create' | 'delete' | 'update' | 'set-main'
  addressId: number
}
