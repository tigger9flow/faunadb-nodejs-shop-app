import { RouteOptions } from 'fastify'
import { numericString } from '../../common'
import { OrderedItemInput, OrderStatus } from './order.type'
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
    orderRepo.createOrder(
      body as Record<'items', OrderedItemInput[]>,
    ),
}

const updateOrder: RouteOptions = {
  method: 'PUT',
  url: '/orders/:orderRef',
  schema: {
    params: {
      orderRef: numericString,
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
  handler: ({ params, body }) =>
    orderRepo.updateOrder({
      orderRef: (params as Record<'orderRef', string>).orderRef,
      payload: body as Record<'status', OrderStatus>,
    }),
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

export const routes = [createOrder, updateOrder, listUserOrders]
