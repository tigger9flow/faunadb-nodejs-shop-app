import dotenv from 'dotenv'

dotenv.config()

import Fastify from 'fastify'
import Swagger from 'fastify-swagger'
import { isProd } from './common'
import { applyRoutes } from './routes'

const PORT = process.env.PORT ?? '3000'

const main = async () => {
  const app = Fastify({ logger: !isProd() })

  app.register(Swagger, {
    routePrefix: '/docs',
    exposeRoute: true,
    swagger: {
      info: {
        title: 'FaunaDB NodeJS ShopApp',
        version: '1.0.0',
      },
    },
  })

  applyRoutes(app)

  await app.listen(PORT)

  console.info(`Up and running on :${PORT}`)
}

main()
