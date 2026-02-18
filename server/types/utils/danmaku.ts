import { DateTime } from 'luxon'
import z from 'zod'

export const StringFormatUpSegOptCtime = z.stringFormat(
  'up_seg_opt_ctime',
  (v: string) =>
    DateTime.fromFormat(v, 'yyyy-MM-dd+HH:mm:ss', { zone: 'Asia/Shanghai' })
      .isValid,
)

export const StringFormatUpSegOptModes = z.stringFormat(
  'up_seg_opt_modes',
  (v: string) => {
    const validModes = new Set(['1', '4', '5', '6', '7', '8', '9'])
    return v.split(',').every((mode) => validModes.has(mode.trim()))
  },
)

export const StringFormatUpSegOptPool = z.stringFormat(
  'up_seg_opt_pool',
  (v: string) => {
    const validPools = new Set(['0', '1', '2'])
    return v.split(',').every((pool) => validPools.has(pool.trim()))
  },
)

export const StringFormatUpSegOptAttrs = z.stringFormat(
  'up_seg_opt_attrs',
  (v: string) => {
    return v
      .split(',')
      .every((attr) => z.coerce.number().int().gte(1).lte(22).parse(attr))
  },
)

export const StringFormatUpSegOptMids = z.stringFormat(
  'up_seg_opt_mids',
  (v: string) =>
    v.split(',').every((mid) => z.coerce.bigint().nonnegative().parse(mid)),
)
