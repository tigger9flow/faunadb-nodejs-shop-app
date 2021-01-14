import { RefOrString } from '../../common'

export enum OrderStatus {
  ORDERED = 'ORDERED',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
}

export interface OrderedItem {
  productRef: RefOrString
  quantity: number
  price: number
}

export interface OrderedItemInput extends Omit<OrderedItem, 'price'> {
  productRef: string
}

export interface CreateOrderInput {
  items: OrderedItemInput[]
}

export interface Order {
  status: OrderStatus
  userRef: RefOrString
  items: OrderedItem[]
  // TODO: fix wrong typing as fauna returns not a plain Date object
  orderedAt: Date
}
