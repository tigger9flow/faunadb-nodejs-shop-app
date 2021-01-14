export interface Category {
  name: string
  // TODO: fix wrong typing as fauna returns not a plain Date object
  createdAt: Date
}
