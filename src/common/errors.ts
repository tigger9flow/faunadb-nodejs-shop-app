import { FastifyInstance } from 'fastify'
import HttpErrors from 'http-errors'
import { errors as FaunaErrors } from 'faunadb'

type Ctor<T> = new (...args: any[]) => T

const remapIfFaunaError = (err: unknown): any => {
  const mappings: [
    Ctor<FaunaErrors.FaunaError>,
    Ctor<HttpErrors.HttpError>,
  ][] = [
    [FaunaErrors.NotFound, HttpErrors.NotFound],
    [FaunaErrors.Unauthorized, HttpErrors.Unauthorized],
    [FaunaErrors.PermissionDenied, HttpErrors.Forbidden],
  ]

  const [, HttpError] =
    mappings.find(([Ctor]) => err instanceof Ctor) ?? []

  return HttpError ? new HttpError() : err
}

export const applyErrorHandler = (app: FastifyInstance) => {
  const defaultErrorHandler = app.errorHandler

  app.setErrorHandler((err, request, reply) => {
    defaultErrorHandler(remapIfFaunaError(err), request, reply)
  })
}
