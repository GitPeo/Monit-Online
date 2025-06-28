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
        li.flex-row-between.h-5(v-if='!element.deleted')
          input.mr-2.accent-purple-500(v-model='element.checked', type='checkbox')
          input.mr-2.w-full.bg-transparent.text-sm.outline-none(
            type='text',
            v-model='element.title',
            :class='element.checked ? "line-through text-secondary" : "text-primary"')
          DeleteSVG.btn-svg.w-6.text-rose-400(class='hover:text-rose-500', @click='remove(index)')
          MoveSVG.btn-svg.handle.w-7.text-purple-400(class='hover:text-purple-500')
    // 同步状态指示器
    .flex-row-center.mt-10.text-xs.text-gray-500
      .flex-row-center.gap-1
        .w-2.h-2.rounded-full(:class="syncStatus.color")
        span {{ syncStatus.text }}
        span.text-gray-400(v-if="lastSyncTime") | {{ lastSyncTime }}
    footer.flex-row-between.border-theme.border-t-2.pt-2
      input.mr-2.accent-purple-500(type='checkbox')
      input.text-primary.mr-2.w-full.bg-transparent.text-sm.outline-none(
        v-model='todo',
        @keyup.enter='pullFromServer',
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

// 同步状态
const syncStatus = ref({
  text: '未同步',
  color: 'bg-gray-400'
})

// 最后同步时间
const lastSyncTime = ref('')

// 数据存储
const store = storage({
  // 代办数据
  todos: [
    { title: '吃饭', checked: false, id: 1, order: "a", version: 1, deleted: false },
    { title: '睡觉', checked: false, id: 2, order: "b", version: 2, deleted: false }
  ],
  config: {
    baseUrl: '',
    post: '',
    token: ''
  }
})

// 检查网络连接
const isOnline = () => {
  return navigator.onLine
}

// 更新同步状态
const updateSyncStatus = (text, color) => {
  syncStatus.value = { text, color }
}

// 更新最后同步时间
const updateLastSyncTime = () => {
  const now = new Date()
  lastSyncTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 同步定时器
let syncTimer = null

// 网络重连检测
let networkRetryTimer = null

// 是否需要重试同步
const needRetrySync = ref(false)

// 增加代办
const add = () => {
  // 判断消息为空
  if (todo.value.length === 0) return
  // 插入代办列表
  store.todos.push({
    title: todo.value,
    checked: false,
    id: Date.now(),
    order: "e",
    version: Date.now(),
    deleted: false
  }) 
  // 推送到服务端
  pushToServer()
  // 清空代办消息
  todo.value = ''
 
}

// 删除代办
const remove = (index) => {
  store.todos[index].deleted = true
  store.todos[index].version = Date.now()
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

// 从服务端拉取数据
const pullFromServer = async () => {
  const config = store.config
  
  if (!config.baseUrl || !config.token) {
    updateSyncStatus('配置缺失', 'bg-yellow-400')
    return false
  }

  if (!isOnline()) {
    updateSyncStatus('网络断开', 'bg-red-400')
    needRetrySync.value = true
    return false
  }

  try {
    updateSyncStatus('同步中...', 'bg-blue-400')
    
    const response = await fetch(`http://${config.baseUrl}:${config.post}/api`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (response.ok) {
      const serverTodos = await response.json()
      if (Array.isArray(serverTodos.todos)) {
        store.todos = serverTodos.todos
      }
      console.log(store.todos)
      updateSyncStatus('同步成功', 'bg-green-400')
      updateLastSyncTime()
      needRetrySync.value = false
      return true
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('拉取失败:', error)
    updateSyncStatus('拉取失败', 'bg-red-400')
    needRetrySync.value = true
    return false
  }
}

// 推送数据到服务端
const pushToServer = async () => {
  const config = store.config
  
  if (!config.baseUrl || !config.token) {
    updateSyncStatus('配置缺失', 'bg-yellow-400')
    return false
  }

  if (!isOnline()) {
    updateSyncStatus('网络断开', 'bg-red-400')
    needRetrySync.value = true
    return false
  }

  try {
    updateSyncStatus('推送中...', 'bg-blue-400')
    
    const response = await fetch(`http://${config.baseUrl}:${config.post}/api`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(store.todos)
    })

    if (response.ok) {
      pullFromServer()
      updateSyncStatus('同步成功', 'bg-green-400')
      updateLastSyncTime()
      needRetrySync.value = false
      return true
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('同步失败:', error)
    updateSyncStatus('同步失败', 'bg-red-400')
    needRetrySync.value = true
    return false
  }
}

// 启动定时同步
const startSyncTimer = () => {
  // 清除现有定时器
  if (syncTimer) {
    clearInterval(syncTimer)
  }
  
  // 每分钟同步一次
  syncTimer = setInterval(() => {
    pullFromServer()
  }, 60000) // 60秒 = 1分钟
}

// 组件挂载时
// onMounted(() => {
//   // 初始同步
//   pullFromServer()
  
//   // 启动定时同步
//   startSyncTimer()
  
//   // 启动网络重连检测
//   startNetworkRetry()
  
//   // 监听网络状态变化
//   window.addEventListener('online', handleOnline)
//   window.addEventListener('offline', handleOffline)
// })

// 网络状态变化监听
const handleOnline = () => {
  console.log('网络已连接')
  if (needRetrySync.value) {
    pullFromServer()
  }
}

const handleOffline = () => {
  console.log('网络已断开')
  updateSyncStatus('网络断开', 'bg-red-400')
}


</script>
