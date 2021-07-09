import { RouteOptions } from 'fastify'
import {
  WithAuthorization,
  authorizationSchema,
  schemaSecurity,
  numericStringSchema,
} from '../../common'
import { Product, SortOpt } from './product.type'
import * as productRepo from './product.repository'
import HttpErrors from 'http-errors'

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
      items: numericStringSchema,
    },
  },
  required: ['name', 'price', 'quantity', 'inCategoryRefs'],
}

const createProduct: RouteOptions = {
  method: 'POST',
  url: '/products',
  schema: {
    headers: authorizationSchema,
    security: schemaSecurity,
    body: productPayloadSchema,
  },
  handler: ({ body, headers }) => {
    const { authorization } = headers as WithAuthorization

    if (!authorization) {
      return Promise.reject(new HttpErrors.Unauthorized())
    }

    return productRepo.createProduct({
      secret: authorization,
      payload: body as Omit<Product, 'createdAt'> &
        Record<'inCategoryRefs', string[]>,
    })
  },
}

const listQuerySchema = {
  sortBy: {
    enum: Object.values(SortOpt),
  },
  size: {
    type: 'integer',
    minimum: 1,
    maximum: 50,
  },
}

const listProductsByCategory: RouteOptions = {
  method: 'GET',
  url: '/categories/:categoryRef/products',
  schema: {
    querystring: listQuerySchema,
    params: {
      categoryRef: numericStringSchema,
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
  listProductsByCategory,
]
