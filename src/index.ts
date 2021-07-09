import dotenv from 'dotenv'

dotenv.config()

import Fastify from 'fastify'
import cors from 'fastify-cors'
import Swagger from 'fastify-swagger'
import { isProd } from './common'
import { applyRoutes } from './routes'
import { applyErrorHandler } from './common/errors'

const PORT = process.env.PORT ?? '4000'

const main = async () => {
  const app = Fastify({
    logger: !isProd(),
    ajv: {
      customOptions: {
        removeAdditional: 'all',
      },
    },
  })

  app.register(cors).register(Swagger, {
    routePrefix: '/docs',
    exposeRoute: true,
    swagger: {
      info: {
        title: 'FaunaDB NodeJS ShopApp',
        version: '1.0.0',
      },
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'authorization',
          in: 'header',
        },
      },
    },
  })

  applyRoutes(app)
  applyErrorHandler(app)

  await app.listen(PORT)
}

main().catch(console.error)
