import { RouteOptions } from 'fastify'
import {
  UserCredentials,
  CustomerRegistrationPayload,
  UserType,
} from './user.type'
import * as userRepo from './user.repository'

const nonEmptyStringSchema = {
  type: 'string',
  minLength: 1,
}
const phoneSchema = {
  type: 'string',
  minLength: 10,
  maxLength: 15,
  pattern: '^[0-9]+$',
}

const register: RouteOptions = {
  url: '/users/register',
  method: 'POST',
  schema: {
    body: {
      type: 'object',
      properties: {
        phone: phoneSchema,
        firstName: nonEmptyStringSchema,
        lastName: nonEmptyStringSchema,
        address: nonEmptyStringSchema,
        password: {
          type: 'string',
          minLength: 8,
        },
      },
      required: [
        'phone',
        'firstName',
        'lastName',
        'address',
        'password',
      ],
    },
  },
  handler: ({ body }) =>
    userRepo
      .registerUser({
        ...(body as Omit<CustomerRegistrationPayload, 'type'>),
        type: UserType.CUSTOMER,
      })
      .then(({ secret }) => ({
        authorization: secret,
      })),
}

const login: RouteOptions = {
  url: '/users/login',
  method: 'POST',
  schema: {
    body: {
      type: 'object',
      properties: {
        phone: phoneSchema,
        password: nonEmptyStringSchema,
      },
      required: ['phone', 'password'],
    },
  },
  handler: ({ body }) =>
    userRepo
      .loginUser(body as UserCredentials)
      .then(({ secret }) => ({
        authorization: secret,
      })),
}

export const routes = [register, login]
