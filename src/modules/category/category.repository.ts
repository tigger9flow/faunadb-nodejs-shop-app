import { query as Q, values as V } from 'faunadb'
import { WithSecret, mergeWithRef } from '../../common'
import * as Db from '../../db'
import { Category } from './category.type'

export interface CreateCategoryInput extends WithSecret {
  payload: Omit<Category, 'createdAt'>
}

export const createCategory = ({
  secret,
  payload,
}: CreateCategoryInput) => {
  const CreateCategory = Q.Create(Q.Collection(Db.CATEGORIES), {
    data: {
      ...payload,
      createdAt: Q.Now(),
    },
  })

  return Db.client
    .query<V.Document<Category>>(CreateCategory, {
      secret,
    })
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
