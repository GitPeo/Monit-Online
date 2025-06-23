/*
 * @Author: fzf404
 * @Date: 2022-05-25 23:18:50
 * @LastEditors: fzf404 me@fzf404.art
 * @LastEditTime: 2023-04-20 21:21:12
 * @Description: plugin 配置
 */

import { debugFilter } from './utils'

// 插件配置
interface plugin {
  icon: string
  name: string
  size: number[]
  description: string
  debug?: boolean
}

// 插件列表
export const pluginList: plugin[] = debugFilter([
  { icon: '📝', name: 'todo', size: [2, 3], description: '待办' },
  { icon: '⚙️', name: 'config', size: [2, 3], description: '配置' }
])

// 判断插件存在
export const pluginExist = (name: string): boolean => {
  return pluginList.some((item) => item.name === name)
}

// 获取插件配置
export const getPluginConfig = (name: string): plugin => {
  return pluginList.find((item) => item.name === name) as plugin
}
