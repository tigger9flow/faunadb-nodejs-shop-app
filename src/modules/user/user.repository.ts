import HttpErrors from 'http-errors'
import { query as Q, errors as FaunaErrors } from 'faunadb'
import * as Db from '../../db'
import { RegistrationPayload, UserCredentials } from './user.type'

const LoginQuery = ({ phone, password }: UserCredentials) =>
  Q.Login(Q.Match(Q.Index(Db.USERS_SEARCH_BY_PHONE), phone), {
    password,
  })

export const registerUser = ({
  password,
  ...payload
}: RegistrationPayload) => {
  const RegisterQuery = Q.Do(
    Q.Create(Q.Collection(Db.USERS), {
      data: {
        ...payload,
        registeredAt: Q.Now(),
      },
      credentials: { password },
    }),
    LoginQuery({
      phone: payload.phone,
      password,
    }),
  )

  return Db.client
    .query<Record<'secret', string>>(RegisterQuery)
    .then(({ secret }) => ({
      secret,
    }))
}

export const loginUser = (credentials: UserCredentials) =>
  Db.client
    .query<Record<'secret', string>>(LoginQuery(credentials))
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
