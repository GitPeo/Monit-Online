<!--
 * @Author: fzf404
 * @Date: 2022-05-26 17:37:12
 * @LastEditors: fzf404 me@fzf404.art
 * @LastEditTime: 2023-04-17 20:41:04
 * @Description: todo 待办事项管理
-->

<template lang="pug">
main
  article.flex-col-between.p-4.pt-8
    draggable.scrollable.space-y-1(tag='ul', handle='.handle', item-key='id', :list='store.todos', :animation='200')
      template(#item='{ element, index }')
        li.flex-row-between.h-5
          input.mr-2.accent-purple-500(v-model='element.checked', type='checkbox')
          input.mr-2.w-full.bg-transparent.text-sm.outline-none(
            type='text',
            v-model='element.title',
            :class='element.checked ? "line-through text-secondary" : "text-primary"')
          DeleteSVG.btn-svg.w-6.text-rose-400(class='hover:text-rose-500', @click='remove(index)')
          MoveSVG.btn-svg.handle.w-7.text-purple-400(class='hover:text-purple-500')
    footer.flex-row-between.border-theme.border-t-2.pt-2
      input.mr-2.accent-purple-500(type='checkbox')
      input.text-primary.mr-2.w-full.bg-transparent.text-sm.outline-none(
        v-model='todo',
        @keyup.enter='add',
        type='text')
      AddSVG.btn-svg.mr-2.w-5.text-cyan-400(class='hover:text-cyan-500', @click='add')
</template>

<script setup>
import { ref } from 'vue'
import draggable from 'vuedraggable'

import { storage } from '~/lib/storage'

import AddSVG from '@/assets/plugin/todo/add.svg'
import DeleteSVG from '@/assets/plugin/todo/delete.svg'
import MoveSVG from '@/assets/plugin/todo/move.svg'

// 代办消息
const todo = ref('')

// 数据存储
const store = storage({
  // 代办数据
  todos: [
    { title: '吃饭', checked: false, id: 1 },
    { title: '睡觉', checked: false, id: 2 },
    { title: '写代码', checked: true, id: 3 }
  ],
  config: {
    baseUrl: '',
    post: '',
    token: ''
  }
})

// 增加代办
const add = () => {
  // 判断消息为空
  if (todo.value.length === 0) return
  // 插入代办列表
  store.todos.push({
    title: todo.value,
    checked: false,
    id: Date.now()
  }) 
  // 推送到服务端
  pushToServer()
  // 清空代办消息
  todo.value = ''
 
}

// 删除代办
const remove = (index) => {
  store.todos.splice(index, 1)
}

// 生成请求头
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  }
  
  if (store.config.token) {
    headers['Authorization'] = `Bearer ${store.config.token}`
  }
  
  return headers
}

// 推送数据到服务端
const pushToServer = async () => {
  const config = store.config
  
  // if (!config.baseUrl || !config.token) {
  //   updateSyncStatus('配置缺失', 'bg-yellow-400')
  //   return false
  // }

  // if (!isOnline()) {
  //   updateSyncStatus('网络断开', 'bg-red-400')
  //   needRetrySync.value = true
  //   return false
  // }

  try {
    // updateSyncStatus('推送中...', 'bg-blue-400')
    
    const response = await fetch(`http://${config.baseUrl}:${config.post}/api`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(store.todos)
    })

    if (response.ok) {
      // updateSyncStatus('推送成功', 'bg-green-400')
      // updateLastSyncTime()
      // needRetrySync.value = false
      return true
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('推送失败:', error)
    // updateSyncStatus('推送失败', 'bg-red-400')
    // needRetrySync.value = true
    return false
  }
}
</script>
