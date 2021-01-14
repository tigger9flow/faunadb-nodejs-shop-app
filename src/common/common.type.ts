import { values as V } from 'faunadb'

export type RefOrString = string | V.Ref

export type RecStringList = string | RecStringList[]
