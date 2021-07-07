import HttpErrors from 'http-errors'
import { query as Q, errors as FaunaErrors } from 'faunadb'
import * as Db from '../../db'
import {
  UserType,
  RegistrationPayload,
  LoginPayload,
} from './user.type'

const resolveCollectionByType = (type: UserType) => {
  const collectionName = {
    [UserType.CUSTOMER]: Db.CUSTOMERS,
    [UserType.MANAGER]: Db.MANAGERS,
  }[type]

  return Q.Collection(collectionName)
}

const resolveIndexByType = (type: UserType) => {
  const collectionName = {
    [UserType.CUSTOMER]: Db.CUSTOMERS_SEARCH_BY_PHONE,
    [UserType.MANAGER]: Db.MANAGERS_SEARCH_BY_PHONE,
  }[type]

  return Q.Index(collectionName)
}

const LoginQuery = ({ phone, password, type }: LoginPayload) =>
  Q.Login(Q.Match(resolveIndexByType(type), phone), {
    password,
  })

export const registerUser = ({
  password,
  type,
  ...payload
}: RegistrationPayload) => {
  const RegisterQuery = Q.Do(
    Q.Create(resolveCollectionByType(type), {
      data: {
        ...payload,
        registeredAt: Q.Now(),
      },
      credentials: { password },
    }),
    LoginQuery({
      phone: payload.phone,
      password,
      type,
    }),
  )

  return Db.client
    .query<Record<'secret', string>>(RegisterQuery)
    .then(({ secret }) => ({
      secret,
    }))
}

export const loginUser = (payload: LoginPayload) =>
  Db.client
    .query<Record<'secret', string>>(LoginQuery(payload))
    .then(({ secret }) => ({
      secret,
    }))
    .catch(err =>
      Promise.reject(
        err instanceof FaunaErrors.BadRequest
          ? new HttpErrors.Unauthorized()
          : err,
      ),
    )
