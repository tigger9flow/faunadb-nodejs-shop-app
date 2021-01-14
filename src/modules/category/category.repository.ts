import { query as Q, values as V } from 'faunadb'
import { mergeWithRef } from '../../common'
import * as Db from '../../db'
import { Category } from './category.type'

export const createCategory = (
  payload: Omit<Category, 'createdAt'>,
) => {
  const CreateCategory = Q.Create(Q.Collection(Db.CATEGORIES), {
    data: {
      ...payload,
      createdAt: Q.Now(),
    },
  })

  return Db.client
    .query<V.Document<Category>>(CreateCategory)
    .then(mergeWithRef())
}

export const listCategories = () => {
  const ListCategories = Q.Map(
    Q.Paginate(Q.Documents(Q.Collection(Db.CATEGORIES))),
    Q.Lambda('ref', Q.Get(Q.Var('ref'))),
  )

  return Db.client
    .query<V.Page<V.Document<Category>>>(ListCategories)
    .then(({ data }) => ({
      data: data.map(mergeWithRef()),
    }))
}
