import { RouteOptions } from 'fastify'
import {
  RegistrationPayload,
  UserType,
  LoginPayload,
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
        password: {
          type: 'string',
          minLength: 8,
        },
      },
      required: ['phone', 'firstName', 'lastName', 'password'],
    },
  },
  handler: ({ body }) =>
    userRepo
      .registerUser({
        ...(body as Omit<RegistrationPayload, 'type'>),
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
        type: {
          type: 'string',
          enum: Object.values(UserType),
        },
      },
      required: ['phone', 'password', 'type'],
    },
  },
  handler: ({ body }) =>
    userRepo.loginUser(body as LoginPayload).then(({ secret }) => ({
      authorization: secret,
    })),
}

export const routes = [register, login]
