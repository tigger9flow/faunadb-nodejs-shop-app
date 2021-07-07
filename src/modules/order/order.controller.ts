import { RouteOptions } from 'fastify'
import HttpErrors from 'http-errors'
import {
  WithAuthorization,
  authorizationSchema,
  numericStringSchema,
  schemaSecurity,
} from '../../common'
import { OrderedItemInput, OrderStatus } from './order.type'
import * as orderRepo from './order.repository'

const createOrder: RouteOptions = {
  method: 'POST',
  url: '/orders',
  schema: {
    headers: authorizationSchema,
    security: schemaSecurity,
    body: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productRef: numericStringSchema,
              quantity: {
                type: 'integer',
                minimum: 1,
              },
            },
            required: ['productRef', 'quantity'],
          },
        },
      },
      required: ['items'],
    },
  },
  handler: async ({ body, headers }) => {
    const { authorization } = headers as WithAuthorization

    if (!authorization) {
      return Promise.reject(new HttpErrors.Unauthorized())
    }

    return orderRepo.createOrder({
      secret: authorization,
      ...(body as Record<'items', OrderedItemInput[]>),
    })
  },
}

const updateOrder: RouteOptions = {
  method: 'PUT',
  url: '/orders/:orderRef',
  schema: {
    headers: authorizationSchema,
    security: schemaSecurity,
    params: {
      orderRef: numericStringSchema,
    },
    body: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(OrderStatus),
        },
      },
      required: ['status'],
    },
  },
  handler: ({ headers, params, body }) => {
    const { authorization } = headers as WithAuthorization

    if (!authorization) {
      return Promise.reject(new HttpErrors.Unauthorized())
    }

    return orderRepo.updateOrder({
      secret: authorization,
      orderRef: (params as Record<'orderRef', string>).orderRef,
      payload: body as Record<'status', OrderStatus>,
    })
  },
}

const listCustomerOrders: RouteOptions = {
  method: 'GET',
  url: '/customers/current/orders',
  schema: {
    headers: authorizationSchema,
    security: schemaSecurity,
  },
  handler: ({ headers }) => {
    const { authorization } = headers as WithAuthorization

    if (!authorization) {
      return Promise.reject(new HttpErrors.Unauthorized())
    }

    return orderRepo.listCustomerOrders({
      secret: authorization,
    })
  },
}

const listOrderChanges: RouteOptions = {
  method: 'GET',
  url: '/customers/current/orders/:orderRef/changes',
  schema: {
    headers: authorizationSchema,
    security: schemaSecurity,
    params: {
      orderRef: numericStringSchema,
    },
  },
  handler: ({ headers, params }) => {
    const { authorization } = headers as WithAuthorization

    if (!authorization) {
      return Promise.reject(new HttpErrors.Unauthorized())
    }

    return orderRepo.listOrderChanges({
      secret: authorization,
      orderRef: (params as Record<'orderRef', string>).orderRef,
    })
  },
}

export const routes = [
  createOrder,
  updateOrder,
  listCustomerOrders,
  listOrderChanges,
]
