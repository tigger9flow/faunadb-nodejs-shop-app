import HttpErrors from 'http-errors'
import {
  query as Q,
  values as V,
  errors as FaunaErrors,
} from 'faunadb'
import { WithSecret, mergeWithRef } from '../../common'
import * as Db from '../../db'
import { Order, OrderedItemInput, OrderStatus } from './order.type'

export interface UpdateOrderInput extends WithSecret {
  orderRef: string
  payload: Pick<Order, 'status'>
}

export const createOrder = async ({
  items,
  secret,
}: Record<'items', OrderedItemInput[]> & WithSecret) => {
  const userRef = await Db.clientForSecret(secret).query(
    Q.CurrentIdentity(),
  )

  const productRefAndQuantities = items.map(
    ({ productRef, quantity }) => ({
      productRef: Q.Ref(Q.Collection(Db.PRODUCTS), productRef),
      quantity,
    }),
  )

  const RemapProductRefToProductDoc = Q.Lambda(
    'productRefAndQuantity',
    {
      product: Q.Get(
        Q.Select(['productRef'], Q.Var('productRefAndQuantity')),
      ),
      // Just pass through
      quantity: Q.Select(
        ['quantity'],
        Q.Var('productRefAndQuantity'),
      ),
    },
  )

  const DecrementQuantityForProduct = Q.Lambda(
    'productAndQuantity',
    Q.Let(
      {
        product: Q.Select(['product'], Q.Var('productAndQuantity')),
        productRef: Q.Select(['ref'], Q.Var('product')),
        availableQuantity: Q.Select(
          ['data', 'quantity'],
          Q.Var('product'),
        ),
        requestedQuantity: Q.Select(
          ['quantity'],
          Q.Var('productAndQuantity'),
        ),
        updatedQuantity: Q.Subtract(
          Q.Var('availableQuantity'),
          Q.Var('requestedQuantity'),
        ),
      },
      Q.If(
        Q.GT(Q.Var('updatedQuantity'), 0),
        Q.Update(Q.Var('productRef'), {
          data: {
            quantity: Q.Var('updatedQuantity'),
          },
        }),
        Q.Abort(`Insufficient product's quantity`),
      ),
    ),
  )

  const RemapProductAndQuantityToOrderedItem = Q.Lambda(
    'productAndQuantity',
    Q.Let(
      {},
      {
        productRef: Q.Select(
          ['product', 'ref'],
          Q.Var('productAndQuantity'),
        ),
        quantity: Q.Select(['quantity'], Q.Var('productAndQuantity')),
        price: Q.Select(
          ['product', 'data', 'price'],
          Q.Var('productAndQuantity'),
        ),
      },
    ),
  )

  const CreateOrderFlow = Q.Let(
    {
      productAndQuantities: Q.Map(
        productRefAndQuantities,
        RemapProductRefToProductDoc,
      ),
    },
    Q.Do(
      Q.Map(
        Q.Var('productAndQuantities'),
        DecrementQuantityForProduct,
      ),
      Q.Create(Q.Collection(Db.ORDERS), {
        data: {
          userRef,
          status: OrderStatus.ORDERED,
          items: Q.Map(
            Q.Var('productAndQuantities'),
            RemapProductAndQuantityToOrderedItem,
          ),
          orderedAt: Q.Now(),
        },
      }),
    ),
  )

  return Db.client
    .query<V.Document<Order>>(CreateOrderFlow)
    .then(mergeWithRef())
    .catch(err =>
      Promise.reject(
        err instanceof FaunaErrors.BadRequest
          ? new HttpErrors.BadRequest(
              ((err as unknown) as Record<
                'description',
                string
              >).description,
            )
          : err,
      ),
    )
}

export const updateOrder = ({
  secret,
  orderRef,
  payload: { status },
}: UpdateOrderInput) => {
  const UpdateOrderQuery = Q.Update(
    Q.Ref(Q.Collection(Db.ORDERS), orderRef),
    {
      data: { status },
    },
  )

  return Db.clientForSecret(secret)
    .query<V.Document<Order>>(UpdateOrderQuery)
    .then(mergeWithRef({ refFields: ['userRef'] }))
}

export const listUserOrders = ({ secret }: WithSecret) => {
  const ListUserOrders = Q.Map(
    Q.Paginate(
      Q.Match(Q.Index(Db.ORDERS_SEARCH_BY_USER), Q.CurrentIdentity()),
    ),
    Q.Lambda(['_', 'ref'], Q.Get(Q.Var('ref'))),
  )

  return Db.clientForSecret(secret)
    .query<V.Page<V.Document<Order>>>(ListUserOrders)
    .then(({ data }) => ({
      data: data.map(mergeWithRef({ refFields: ['userRef'] })),
    }))
}
