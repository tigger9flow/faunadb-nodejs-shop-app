import dotenv from 'dotenv'

dotenv.config()

import { query as Q, Expr } from 'faunadb'
import * as Db from '.'

const MakeCollection = (name: string) =>
  Q.If(
    Q.Exists(Q.Collection(name)),
    true,
    Q.CreateCollection({ name }),
  )

const MakeIndex = (name: string, IndexDef: Expr) =>
  Q.If(Q.Exists(Q.Index(name)), true, IndexDef)

const collections = [Db.USERS, Db.PRODUCTS, Db.CATEGORIES, Db.ORDERS]

const createdAtDescAndRef = [
  {
    field: ['data', 'createdAt'],
    reverse: true,
  },
  {
    field: ['ref'],
  },
]

const indexes: [string, Expr][] = [
  // Products
  [
    Db.PRODUCTS_SEARCH_BY_CATEGORY,
    Q.CreateIndex({
      name: Db.PRODUCTS_SEARCH_BY_CATEGORY,
      source: Q.Collection(Db.PRODUCTS),
      terms: [
        {
          field: ['data', 'inCategoryRefs'],
        },
      ],
    }),
  ],
  [
    Db.PRODUCTS_SORT_BY_PRICE_ASC,
    Q.CreateIndex({
      name: Db.PRODUCTS_SORT_BY_PRICE_ASC,
      source: Q.Collection(Db.PRODUCTS),
      terms: [{ field: ['ref'] }],
      values: [
        {
          field: ['data', 'price'],
        },
        ...createdAtDescAndRef,
      ],
    }),
  ],
  [
    Db.PRODUCTS_SORT_BY_PRICE_DESC,
    Q.CreateIndex({
      name: Db.PRODUCTS_SORT_BY_PRICE_DESC,
      source: Q.Collection(Db.PRODUCTS),
      terms: [{ field: ['ref'] }],
      values: [
        {
          field: ['data', 'price'],
          reverse: true,
        },
        ...createdAtDescAndRef,
      ],
    }),
  ],
  [
    Db.PRODUCTS_SORT_BY_IN_STOCK_AND_CREATED_AT,
    Q.CreateIndex({
      name: Db.PRODUCTS_SORT_BY_IN_STOCK_AND_CREATED_AT,
      source: {
        collection: Q.Collection(Db.PRODUCTS),
        fields: {
          inStock: Q.Query(
            Q.Lambda(
              'doc',
              Q.If(
                Q.GT(Q.Select(['data', 'quantity'], Q.Var('doc')), 0),
                1,
                0,
              ),
            ),
          ),
        },
      },
      terms: [{ field: ['ref'] }],
      values: [
        {
          binding: 'inStock',
          reverse: true,
        },
        ...createdAtDescAndRef,
      ],
    }),
  ],
]

const bootstrap = async () => {
  for (const name of collections) {
    await Db.client.query(MakeCollection(name))
  }

  for (const [name, IndexDef] of indexes) {
    await Db.client.query(MakeIndex(name, IndexDef))
  }

  console.info('Ok')
}

bootstrap().catch(console.error)
