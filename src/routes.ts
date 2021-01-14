import { FastifyInstance, RouteOptions } from 'fastify'
import { routes as categoryRoutes } from './modules/category/category.controller'
import { routes as productRoutes } from './modules/product/product.controller'
import { routes as orderRoutes } from './modules/order/order.controller'

const allRoutes: RouteOptions[] = [
  ...productRoutes,
  ...categoryRoutes,
  ...orderRoutes,
]

export const applyRoutes = (app: FastifyInstance) =>
  allRoutes.forEach(route => app.route(route))
