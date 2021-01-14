export enum UserType {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export interface User {
  firstName: string
  lastName: string
  phone: string
  address: string
  type: UserType
  registeredAt: Date
}
