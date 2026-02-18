import { DateTime } from 'luxon'
import z from 'zod'
import { StringFormatUpSegOptCtime } from '../types/utils/danmaku'

export const stringToBigInt = z.codec(z.string(), z.bigint(), {
  decode: (str) => BigInt(str),
  encode: (bigint) => bigint.toString(),
})

export const upSegOptCtimeToDateTime = z.codec(
  StringFormatUpSegOptCtime,
  z.custom<DateTime>((v) => v instanceof DateTime),
  {
    decode: (str) =>
      DateTime.fromFormat(str, 'yyyy-MM-dd+HH:mm:ss', {
        zone: 'Asia/Shanghai',
      }).setZone('Asia/Shanghai'),
    encode: (datetime: DateTime) => datetime.toFormat('yyyy-MM-dd+HH:mm:ss'),
  },
)
