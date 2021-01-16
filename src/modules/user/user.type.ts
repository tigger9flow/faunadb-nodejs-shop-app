export enum UserType {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export interface UserEssential {
  phone: string
  type: UserType
  registeredAt: Date
}

export interface Customer extends UserEssential {
  type: UserType.CUSTOMER
  firstName: string
  lastName: string
  address: string
}

export interface Admin extends UserEssential {
  type: UserType.ADMIN
}

export type User = Customer | Admin

export interface UserCredentials extends Pick<User, 'phone'> {
  password: string
}

export interface AdminRegistrationPayload
  extends UserCredentials,
    Omit<UserEssential, 'type' | 'registeredAt'>,
    Omit<Admin, 'registeredAt'> {}

export interface CustomerRegistrationPayload
  extends UserCredentials,
    Omit<UserEssential, 'type' | 'registeredAt'>,
    Omit<Customer, 'registeredAt'> {}

export type RegistrationPayload =
  | AdminRegistrationPayload
  | CustomerRegistrationPayload
