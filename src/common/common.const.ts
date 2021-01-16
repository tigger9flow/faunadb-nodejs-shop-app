export const numericStringSchema = {
  type: 'string',
  pattern: '^[0-9]+$',
  minLength: 1,
} as const

export const authorizationSchema = {
  type: 'object',
  properties: {
    authorization: {
      type: 'string',
      minLength: 1,
    },
  },
} as const

export const schemaSecurity = [{ apiKey: [] }]
