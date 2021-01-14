import { RouteOptions } from 'fastify'
import { Category } from './category.type'
import * as categoryRepo from './category.repository'

const createCategory: RouteOptions = {
  method: 'POST',
  url: '/categories',
  schema: {
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
  handler: req =>
    categoryRepo.createCategory(
      req.body as Omit<Category, 'createdAt'>,
    ),
}

const listCategories: RouteOptions = {
  method: 'GET',
  url: '/categories',
  handler: () => categoryRepo.listCategories(),
}

export const routes = [createCategory, listCategories]
