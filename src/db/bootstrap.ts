import dotenv from 'dotenv'

dotenv.config()

import { Expr, query as Q } from 'faunadb'
import * as Db from '.'
import { UserType } from '../modules/user/user.type'
import * as usersRepo from '../modules/user/user.repository'

const {
  FAUNA_SECRET_ADMIN_KEY,
  ADMIN_PHONE,
  ADMIN_PASSWORD,
} = process.env

if (
  ![FAUNA_SECRET_ADMIN_KEY, ADMIN_PHONE, ADMIN_PASSWORD].every(
    Boolean,
  )
) {
  throw new Error('Missing env variables')
}

const CreateIfNotExists = (Resource: Expr, CreateDef: Expr) =>
  Q.If(Q.Exists(Resource), true, CreateDef)

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

const indexes: [Expr, Expr][] = [
  // Users
  [
    Q.Index(Db.USERS_SEARCH_BY_PHONE),
    Q.CreateIndex({
      name: Db.USERS_SEARCH_BY_PHONE,
      source: Q.Collection(Db.USERS),
      terms: [{ field: ['data', 'phone'] }],
      unique: true,
    }),
  ],
  // Products
  [
    Q.Index(Db.PRODUCTS_SEARCH_BY_CATEGORY),
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
    Q.Index(Db.PRODUCTS_SORT_BY_PRICE_ASC),
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
    Q.Index(Db.PRODUCTS_SORT_BY_PRICE_DESC),
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
    Q.Index(Db.PRODUCTS_SORT_BY_IN_STOCK_AND_CREATED_AT),
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
  // Orders
  [
    Q.Index(Db.ORDERS_SEARCH_BY_USER),
    Q.CreateIndex({
      name: Db.ORDERS_SEARCH_BY_USER,
      source: Q.Collection(Db.ORDERS),
      terms: [{ field: ['data', 'userRef'] }],
      values: [
        {
          field: ['data', 'orderedAt'],
        },
        { field: ['ref'] },
      ],
    }),
  ],
]

const OwnedDocument = (ownerRefPath: string[]) =>
  Q.Query(
    Q.Lambda(
      'ref',
      Q.Let(
        {
          doc: Q.Get(Q.Var('ref')),
        },
        Q.Equals(
          Q.CurrentIdentity(),
          Q.Select(ownerRefPath, Q.Var('doc')),
        ),
      ),
    ),
  )

const MembershipFor = (userType: UserType) => ({
  resource: Q.Collection(Db.USERS),
  predicate: Q.Query(
    Q.Lambda(
      'userRef',
      Q.Let(
        {
          userDoc: Q.Get(Q.Var('userRef')),
          userType: Q.Select(['data', 'type'], Q.Var('userDoc')),
        },
        Q.Equals(userType, Q.Var('userType')),
      ),
    ),
  ),
})

const roles: [Expr, Expr][] = [
  [
    Q.Role(Db.CUSTOMER_ROLE),
    Q.CreateRole({
      name: Db.CUSTOMER_ROLE,
      membership: MembershipFor(UserType.CUSTOMER),
      privileges: [
        {
          resource: Q.Collection(Db.ORDERS),
          actions: {
            read: OwnedDocument(['data', 'userRef']),
            history_read: OwnedDocument(['data', 'userRef']),
          },
        },
        {
          resource: Q.Index(Db.ORDERS_SEARCH_BY_USER),
          actions: {
            read: Q.Query(
              Q.Lambda(
                'terms',
                Q.Equals(
                  Q.CurrentIdentity(),
                  Q.Select([0], Q.Var('terms')),
                ),
              ),
            ),
          },
        },
      ],
    }),
  ],
  [
    Q.Role(Db.ADMIN_ROLE),
    Q.CreateRole({
      name: Db.ADMIN_ROLE,
      membership: MembershipFor(UserType.ADMIN),
      privileges: [
        {
          resource: Q.Collection(Db.PRODUCTS),
          actions: {
            create: true,
          },
        },
        {
          resource: Q.Collection(Db.CATEGORIES),
          actions: {
            create: true,
          },
        },
        {
          resource: Q.Collection(Db.ORDERS),
          actions: {
            write: true,
          },
        },
      ],
    }),
  ],
]

const bootstrap = async () => {
  const client = Db.clientForSecret(FAUNA_SECRET_ADMIN_KEY!)

  const resources: [Expr, Expr][] = [
    ...collections.map<[Expr, Expr]>(name => [
      Q.Collection(name),
      Q.CreateCollection({ name }),
    ]),
    ...indexes,
    ...roles,
  ]

  for (const pair of resources) {
    await client.query(CreateIfNotExists(...pair))
  }

  // Create admin user
  const adminExists = await client.query(
    Q.Exists(
      Q.Match(Q.Index(Db.USERS_SEARCH_BY_PHONE), ADMIN_PHONE!),
    ),
  )

  if (!adminExists) {
    await usersRepo.registerUser({
      type: UserType.ADMIN,
      phone: ADMIN_PHONE!,
      password: ADMIN_PASSWORD!,
    })

    console.info(`Admin (${ADMIN_PHONE!}) user has been created`)
  }

  console.info('Done')
}

bootstrap().catch(console.error)
