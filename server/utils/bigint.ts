import JSONBigint from 'json-bigint'

export const serilizeBigint = (_key: symbol | string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value

export const JSONBigInt = JSONBigint({ useNativeBigInt: true })
