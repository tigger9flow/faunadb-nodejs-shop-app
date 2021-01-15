import { query as Q, values as V } from 'faunadb'
import { mergeWithRef } from '../../common'
import * as Db from '../../db'
import { Order, OrderedItemInput, OrderStatus } from './order.type'

const FAKED_USER_REF = '287683595233919495'

export interface UpdateOrderInput {
  orderRef: string
  payload: Pick<Order, 'status'>
}

export const createOrder = ({
  items,
}: Record<'items', OrderedItemInput[]>) => {
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
          userRef: FAKED_USER_REF,
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

  return (
    Db.client
      .query<V.Document<Order>>(CreateOrderFlow)
      // TODO: handle transaction aborted error
      .then(mergeWithRef())
  )
}

export const updateOrder = ({
  orderRef,
  payload: { status },
}: UpdateOrderInput) => {
  const UpdateOrderQuery = Q.Update(
    Q.Ref(Q.Collection(Db.ORDERS), orderRef),
    {
      data: { status },
    },
  )

  return Db.client
    .query<V.Document<Order>>(UpdateOrderQuery)
    .then(mergeWithRef())
}

export const listUserOrders = ({
  userRef,
}: Record<'userRef', string>) => {
  const ListUserOrders = Q.Map(
    Q.Paginate(Q.Match(Q.Index(Db.ORDERS_SEARCH_BY_USER), userRef)),
    Q.Lambda(['_', 'ref'], Q.Get(Q.Var('ref'))),
  )

  return Db.client
    .query<V.Page<V.Document<Order>>>(ListUserOrders)
    .then(({ data }) => ({
      data: data.map(mergeWithRef()),
    }))
}
