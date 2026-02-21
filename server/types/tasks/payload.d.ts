import type { BigintToString } from '~s/utils/bigint'

export type TaskPayload<T> = Partial<BigintToString<T>>
