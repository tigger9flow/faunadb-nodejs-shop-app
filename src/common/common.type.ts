import { values as V } from 'faunadb'

export type RefOrString = string | V.Ref

export type RecStringList = string | RecStringList[]

export type WithSecret = Record<'secret', string>

export type WithAuthorization = Partial<
  Record<'authorization', string>
>
