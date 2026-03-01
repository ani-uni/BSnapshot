import { defineHandler } from 'nitro/h3'
import { Series } from '~s/utils/common/series'

// 用于进入group时获取系列列表，因为在顶级组织，所以加入虚拟的def系列
export default defineHandler(async () => {
  const series = await Series.list()
  return [{ id: 'default', title: '无所属季度' }, ...series]
})
