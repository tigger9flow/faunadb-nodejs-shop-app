import { RouteOptions } from 'fastify'
import { numericString } from '../../common'
import { CreateOrderInput } from './order.type'
import * as orderRepo from './order.repository'

const createOrder: RouteOptions = {
  method: 'POST',
  url: '/orders',
  schema: {
    body: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productRef: numericString,
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
  handler: async ({ body }) =>
    orderRepo.createOrder(body as CreateOrderInput),
}

const listUserOrders: RouteOptions = {
  method: 'GET',
  url: '/users/:userRef/orders',
  schema: {
    params: {
      userRef: numericString,
    },
  },
  handler: ({ params }) =>
    orderRepo.listUserOrders(params as Record<'userRef', string>),
}

export const routes = [createOrder, listUserOrders]
