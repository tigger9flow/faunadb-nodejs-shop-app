import Fauna from 'faunadb'

const SECRET =
  process.env.FAUNA_SECRET_SERVER_KEY ||
  process.env.FAUNA_SECRET_ADMIN_KEY

if (!SECRET) {
  throw new Error('Missing "FAUNA_SECRET_SERVER_KEY" env variable')
}

export const client = new Fauna.Client({
  secret: SECRET,
})

export const clientForSecret = (secret: string) =>
  new Fauna.Client({
    secret,
  })
