import { query as Q, values as V } from 'faunadb'
import * as Db from '../../db'
import { mergeWithRef, WithSecret } from '../../common'
import { Product, SortOpt } from './product.type'

export interface ListProductsInput {
  size?: number
  sortBy?: SortOpt
  categoryRef?: string
}

export interface CreateProductInput extends WithSecret {
  payload: Omit<Product, 'createdAt'> &
    Record<'inCategoryRefs', string[]>
}

export const createProduct = ({
  secret,
  payload: { inCategoryRefs, ...payload },
}: CreateProductInput) => {
  const CreateProduct = Q.Create(Q.Collection(Db.PRODUCTS), {
    data: {
      ...payload,
      createdAt: Q.Now(),
      inCategoryRefs: inCategoryRefs.map(ref =>
        Q.Ref(Q.Collection(Db.CATEGORIES), ref),
      ),
    },
  })

  return Db.client
    .query<V.Document<Product>>(CreateProduct, {
      secret,
    })
    .then(mergeWithRef({ refFields: ['inCategoryRefs'] }))
}

export const listProducts = ({
  categoryRef,
  sortBy = SortOpt.AVAILABLE,
  size = 12,
}: ListProductsInput = {}) => {
  const sortIndex = {
    [SortOpt.AVAILABLE]: Db.PRODUCTS_SORT_BY_IN_STOCK_AND_CREATED_AT,
    [SortOpt.PRICE_ASC]: Db.PRODUCTS_SORT_BY_PRICE_ASC,
    [SortOpt.PRICE_DESC]: Db.PRODUCTS_SORT_BY_PRICE_DESC,
  }[sortBy]
  const ProductsMatch = categoryRef
    ? Q.Match(
        Q.Index(Db.PRODUCTS_SEARCH_BY_CATEGORY),
        Q.Ref(Q.Collection(Db.CATEGORIES), categoryRef),
      )
    : Q.Documents(Q.Collection(Db.PRODUCTS))
  const Query = Q.Map(
    Q.Paginate(Q.Join(ProductsMatch, Q.Index(sortIndex)), { size }),
    Q.Lambda(['_', '__', 'ref'], Q.Get(Q.Var('ref'))),
  )

  return Db.client
    .query<V.Page<V.Document<Product>>>(Query)
    .then(({ data }) => ({
      data: data.map(mergeWithRef({ refFields: ['inCategoryRefs'] })),
    }))
}
