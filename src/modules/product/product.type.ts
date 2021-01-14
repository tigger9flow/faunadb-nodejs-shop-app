import { RefOrString } from '../../common'

export enum SortOpt {
  AVAILABLE = 'available',
  PRICE_ASC = 'priceAsc',
  PRICE_DESC = 'priceDesc',
}

export interface Product {
  name: string
  price: number
  quantity: number
  inCategoryRefs: RefOrString[]
  // TODO: fix wrong typing as fauna returns not a plain Date object
  createdAt: Date
}
