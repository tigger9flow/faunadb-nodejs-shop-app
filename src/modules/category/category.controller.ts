import { RouteOptions } from 'fastify'
import HttpErrors from 'http-errors'
import {
  WithAuthorization,
  authorizationSchema,
  schemaSecurity,
} from '../../common'
import { Category } from './category.type'
import * as categoryRepo from './category.repository'

const createCategory: RouteOptions = {
  method: 'POST',
  url: '/categories',
  schema: {
    headers: authorizationSchema,
    security: schemaSecurity,
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    },
  },
  handler: ({ headers, body }) => {
    const { authorization } = headers as WithAuthorization

    if (!authorization) {
      return Promise.reject(new HttpErrors.Unauthorized())
    }

    return categoryRepo.createCategory({
      secret: authorization,
      payload: body as Omit<Category, 'createdAt'>,
    })
  },
}

const listCategories: RouteOptions = {
  method: 'GET',
  url: '/categories',
  handler: () => categoryRepo.listCategories(),
}

export const routes = [createCategory, listCategories]
