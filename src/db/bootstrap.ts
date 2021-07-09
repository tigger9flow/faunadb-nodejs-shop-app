import dotenv from 'dotenv'

dotenv.config()

import { Client, Expr, query as Q } from 'faunadb'
import faker from 'faker'
import * as Db from '.'
import { UserType } from '../modules/user/user.type'
import * as usersRepo from '../modules/user/user.repository'

const {
  FAUNA_SECRET_ADMIN_KEY,
  MANAGER_PHONE,
  MANAGER_PASSWORD,
} = process.env

if (
  ![FAUNA_SECRET_ADMIN_KEY, MANAGER_PHONE, MANAGER_PASSWORD].every(
    Boolean,
  )
) {
  throw new Error('Missing some of env variables')
}

const CreateIfNotExists = (Resource: Expr, CreateDef: Expr) =>
  Q.If(Q.Exists(Resource), true, CreateDef)

const collections = [
  Db.CUSTOMERS,
  Db.MANAGERS,
  Db.PRODUCTS,
  Db.CATEGORIES,
  Db.ORDERS,
]

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
  // Customers
  [
    Q.Index(Db.CUSTOMERS_SEARCH_BY_PHONE),
    Q.CreateIndex({
      name: Db.CUSTOMERS_SEARCH_BY_PHONE,
      source: Q.Collection(Db.CUSTOMERS),
      terms: [{ field: ['data', 'phone'] }],
      unique: true,
    }),
  ],
  // Managers
  [
    Q.Index(Db.MANAGERS_SEARCH_BY_PHONE),
    Q.CreateIndex({
      name: Db.MANAGERS_SEARCH_BY_PHONE,
      source: Q.Collection(Db.MANAGERS),
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
    Q.Index(Db.ORDERS_SEARCH_BY_CUSTOMER),
    Q.CreateIndex({
      name: Db.ORDERS_SEARCH_BY_CUSTOMER,
      source: Q.Collection(Db.ORDERS),
      terms: [{ field: ['data', 'customerRef'] }],
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

const roles: [Expr, Expr][] = [
  [
    Q.Role(Db.CUSTOMER_ROLE),
    Q.CreateRole({
      name: Db.CUSTOMER_ROLE,
      membership: {
        resource: Q.Collection(Db.CUSTOMERS),
      },
      privileges: [
        {
          resource: Q.Collection(Db.ORDERS),
          actions: {
            read: OwnedDocument(['data', 'customerRef']),
            history_read: OwnedDocument(['data', 'customerRef']),
          },
        },
        {
          resource: Q.Index(Db.ORDERS_SEARCH_BY_CUSTOMER),
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
    Q.Role(Db.MANAGER_ROLE),
    Q.CreateRole({
      name: Db.MANAGER_ROLE,
      membership: {
        resource: Q.Collection(Db.MANAGERS),
      },
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

  // Create manager user
  const managerExists = await client.query(
    Q.Exists(
      Q.Match(Q.Index(Db.MANAGERS_SEARCH_BY_PHONE), MANAGER_PHONE!),
    ),
  )

  if (!managerExists) {
    await usersRepo.registerUser({
      type: UserType.MANAGER,
      phone: MANAGER_PHONE!,
      password: MANAGER_PASSWORD!,
      firstName: 'General',
      lastName: 'Manager',
    })

    console.info(`Manager (${MANAGER_PHONE!}) user has been created`)
  }

  await seedData({ client })

  console.info('Seeded data successfully')
  console.info('Done')
}

const seedData = async ({ client }: Record<'client', Client>) => {
  const CATEGORIES_TO_CREATE = 6
  const PRODUCTS_PER_CATEGORY = 12
  const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24
  const dateMax = Date.now() - DAY_IN_MILLISECONDS
  const dateMin = dateMax - DAY_IN_MILLISECONDS * 60

  const makeTime = () =>
    Q.Time(
      faker.datatype
        .datetime({
          min: dateMin,
          max: dateMax,
        })
        .toISOString(),
    )

  const makeCategoryData = () => ({
    name: faker.commerce.department(),
    createdAt: makeTime(),
  })

  const makeProductData = () => ({
    name: faker.commerce.productName(),
    price: Number(faker.commerce.price()),
    quantity: faker.datatype.number({
      min: 0,
      max: 100,
    }),
    createdAt: makeTime(),
  })

  const makeCategory = () =>
    Q.Let(
      {
        category: Q.Create(Q.Collection(Db.CATEGORIES), {
          data: makeCategoryData(),
        }),
        categoryRef: Q.Select('ref', Q.Var('category')),
      },
      Q.Map(
        Array.from(
          { length: PRODUCTS_PER_CATEGORY },
          makeProductData,
        ),
        Q.Lambda(
          'productData',
          Q.Create(Db.PRODUCTS, {
            data: {
              name: Q.Select('name', Q.Var('productData')),
              price: Q.Select('price', Q.Var('productData')),
              quantity: Q.Select('quantity', Q.Var('productData')),
              inCategoryRefs: [Q.Var('categoryRef')],
              createdAt: Q.Select('createdAt', Q.Var('productData')),
            },
          }),
        ),
      ),
    )

  await client.query(
    Q.Do(
      ...Array.from({ length: CATEGORIES_TO_CREATE }, makeCategory),
    ),
  )
}

bootstrap().catch(console.error)
