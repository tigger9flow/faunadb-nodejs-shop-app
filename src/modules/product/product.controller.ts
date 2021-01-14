import { RouteOptions } from 'fastify'
import { numericString } from '../../common'
import { Product, SortOpt } from './product.type'
import * as productRepo from './product.repository'

interface ListQuery {
  size?: number
  sortBy?: SortOpt
}

const productPayloadSchema = {
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
}

const createProduct: RouteOptions = {
  method: 'POST',
  url: '/products',
  schema: {
    body: productPayloadSchema,
  },
  handler: ({ body }) =>
    productRepo.createProduct(
      body as Omit<Product, 'createdAt'> &
        Record<'inCategoryRefs', string[]>,
    ),
}

const listQuery = {
  sortBy: {
    enum: Object.values(SortOpt),
  },
  size: {
    type: 'integer',
    minimum: 1,
    maximum: 50,
  },
}

const listProducts: RouteOptions = {
  method: 'GET',
  url: '/products',
  schema: {
    querystring: listQuery,
  },
  handler: ({ query }) =>
    productRepo.listProducts(query as ListQuery),
}

const listProductsByCategory: RouteOptions = {
  method: 'GET',
  url: '/categories/:categoryRef/products',
  schema: {
    querystring: listQuery,
    params: {
      categoryRef: numericString,
    },
  },
  handler: ({ query, params }) =>
    productRepo.listProducts({
      ...(query as ListQuery),
      categoryRef: (params as Record<'categoryRef', string>)
        .categoryRef,
    }),
}

export const routes = [
  createProduct,
  listProducts,
  listProductsByCategory,
]
