import { DateTime } from 'luxon'

export const zeroDate = DateTime.fromFormat('2009-01-01', 'yyyy-MM-dd', {
  zone: 'Asia/Shanghai',
}).setZone('Asia/Shanghai')
