import { RouteOptions } from 'fastify'
import { Product, SortOpt } from './product.type'
import * as productRepo from './product.repository'

const numericString = {
  type: 'string',
  pattern: '^[0-9]+$',
  minLength: 1,
}

const createProduct: RouteOptions = {
  method: 'POST',
  url: '/products',
  schema: {
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
        },
        price: {
          type: 'number',
          minimum: 1,
        },
        quantity: {
          type: 'integer',
          minimum: 0,
        },
        inCategoryRefs: {
          type: 'array',
          items: numericString,
        },
      },
      required: ['name', 'price', 'quantity', 'inCategoryRefs'],
    },
  },
  handler: req =>
    productRepo.createProduct(
      req.body as Omit<Product, 'createdAt'> &
        Record<'inCategoryRefs', string[]>,
    ),
}

const sortQuery = {
  sortBy: {
    enum: Object.values(SortOpt),
  },
}

const listRecentProducts: RouteOptions = {
  method: 'GET',
  url: '/products',
  schema: {
    querystring: sortQuery,
  },
  handler: req =>
    productRepo.listProducts({
      sortBy: (req.query as Partial<Record<'sortBy', SortOpt>>)
        .sortBy,
    }),
}

const listProductsByCategory: RouteOptions = {
  method: 'GET',
  url: '/categories/:categoryRef/products',
  schema: {
    querystring: sortQuery,
    params: {
      categoryRef: numericString,
    },
  },
  handler: req =>
    productRepo.listProducts({
      sortBy: (req.query as Partial<Record<'sortBy', SortOpt>>)
        .sortBy,
      categoryRef: (req.params as Record<'categoryRef', string>)
        .categoryRef,
    }),
}

export const routes = [
  createProduct,
  listRecentProducts,
  listProductsByCategory,
]
