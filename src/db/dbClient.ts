import Fauna from 'faunadb'

const { FAUNA_SECRET_KEY } = process.env

export const client = new Fauna.Client({
  secret: FAUNA_SECRET_KEY!,
})
