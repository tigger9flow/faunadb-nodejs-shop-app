import { values as V } from 'faunadb'
import update from 'lodash.update'
import { RecStringList } from './common.type'

export interface MergeWithRefInput {
  refFields?: string[]
}

export const isProd = () => process.env.NODE_ENV === 'production'

const serializeRef = (ref: V.Ref | V.Ref[]): RecStringList =>
  Array.isArray(ref) ? ref.map(serializeRef) : ref.id

export const mergeWithRef = ({
  refFields,
}: MergeWithRefInput = {}) => <T extends Record<string, any>>({
  data,
  ref,
}: V.Document<T>): T & { ref: string } => {
  const plain = {
    ...data,
    ref: ref.id,
  }

  for (const path of refFields ?? []) {
    update(plain, path, serializeRef)
  }

  return plain
}
