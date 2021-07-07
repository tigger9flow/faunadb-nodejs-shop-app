export enum UserType {
  MANAGER = 'MANAGER',
  CUSTOMER = 'CUSTOMER',
}

export interface User {
  phone: string
  firstName: string
  lastName: string
  registeredAt: Date
}

export interface WithUserType {
  type: UserType
}

export interface UserCredentials {
  phone: string
  password: string
}

export interface LoginPayload extends UserCredentials, WithUserType {}

export interface RegistrationPayload
  extends UserCredentials,
    Omit<User, 'registeredAt'>,
    WithUserType {}
