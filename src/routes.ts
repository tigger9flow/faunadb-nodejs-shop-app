import { FastifyInstance, RouteOptions } from 'fastify'
import { routes as categoryRoutes } from './modules/category/category.controller'
import { routes as productRoutes } from './modules/product/product.controller'

const allRoutes: RouteOptions[] = [
  ...productRoutes,
  ...categoryRoutes,
]

export const applyRoutes = (app: FastifyInstance) =>
  allRoutes.forEach(route => app.route(route))
