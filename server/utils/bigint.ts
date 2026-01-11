import JSONBigint from 'json-bigint'

export const serilizeBigint = (_key: symbol | string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value

export const JSONBigInt = JSONBigint({ useNativeBigInt: true })

export type BigintToString<T> = T extends bigint
  ? string
  : T extends readonly []
    ? []
    : T extends readonly [infer A, ...infer Rest]
      ? [BigintToString<A>, ...BigintToString<Rest>]
      : T extends readonly (infer U)[]
        ? BigintToString<U>[]
        : T extends object
          ? { [K in keyof T]: BigintToString<T[K]> }
          : T

export const bigint2string = <T>(obj: T): BigintToString<T> => {
  if (typeof obj === 'bigint') {
    return obj.toString() as BigintToString<T>
  } else if (Array.isArray(obj)) {
    return obj.map((item) => bigint2string(item)) as BigintToString<T>
  } else if (obj && typeof obj === 'object') {
    const res: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      res[key] = bigint2string(value)
    }
    return res as BigintToString<T>
  } else {
    return obj as BigintToString<T>
  }
}
