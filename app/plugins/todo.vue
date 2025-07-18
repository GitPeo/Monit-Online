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
    .flex-1.overflow-y-auto
      draggable.scrollable.space-y-1(tag='ul', handle='.handle', item-key='tid', :list='store.todos', :animation='200', @change='dragChange')
        template(#item='{ element, index }')
          li.flex-row-between.h-5(v-if='!element.deleted', @change='updateTodo(index)')
            input.mr-2.accent-purple-500(v-model='element.checked', type='checkbox')
            input.mr-2.w-full.bg-transparent.text-sm.outline-none(
              type='text',
              v-model='element.title',
              :class='element.checked ? "line-through text-secondary" : "text-primary"')
            DeleteSVG.btn-svg.w-6.text-rose-400(class='hover:text-rose-500', @click='remove(index)')
            MoveSVG.btn-svg.handle.w-7.text-purple-400(class='hover:text-purple-500')
    // 同步状态指示器
    .flex-row-center.mt-auto.text-xs.text-gray-500
      .flex-row-center.gap-1
        .w-2.h-2.rounded-full(:class="syncStatus.color")
        span {{ syncStatus.text }}
        span.text-gray-400(v-if="lastSyncTime") | {{ lastSyncTime }}
    footer.flex-row-between.border-theme.border-t-2.pt-2
      input.mr-2.accent-purple-500(type='checkbox')
      input.text-primary.mr-2.w-full.bg-transparent.text-sm.outline-none(
        v-model='todo',
        @keyup.enter='add',
        type='text')
      AddSVG.btn-svg.mr-2.w-5.text-cyan-400(class='hover:text-cyan-500', @click='add')
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import draggable from 'vuedraggable'

import { storage, get } from '~/lib/storage'

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
    { title: '吃饭', checked: false, tid: 1, order: 1.0, version: 1, deleted: false },
    { title: '睡觉', checked: false, tid: 2, order: 2.0, version: 2, deleted: false }
  ]
})

const config = get("config","server")

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

// 增加代办
const add = () => {
  // 判断消息为空
  if (todo.value.length === 0){
    pullFromServer()
    return
  }
  // 插入代办列表
  store.todos.push({
    title: todo.value,
    checked: false,
    tid: Date.now(),
    order: store.todos.length > 1 ? store.todos[store.todos.length - 2].order + 10.0 : 200.0,
    version: Date.now(),
    deleted: false
  }) 
  // 推送到服务端
  pushToServer()
  // 清空代办消息
  todo.value = ''
}

// 拖拽待办
const dragChange = (evt) => {
  var index = evt.moved.newIndex
  if(index == 0){
    store.todos[index].order = store.todos[1].order - 10.0
  }else if(index == store.todos.length-1){
    store.todos[index].order = store.todos[index - 1].order + 10.0
  }else{
    store.todos[index].order = (store.todos[index + 1].order - store.todos[index - 1].order) * (Math.random() / 2 + 0.1) + store.todos[index - 1].order
  }
  updateTodo(index)
}

// todo修改更新
const updateTodo = (index) => {
  store.todos[index].version = Date.now()
  pushToServer()
}

// 删除代办
const remove = (index) => {
  store.todos[index].deleted = true
  updateTodo(index)
}

// 生成请求头
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  }
  
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`
  }
  
  return headers
}

// 从服务端拉取数据
const pullFromServer = async () => {
  
  if (!config.url || !config.post || !config.token) {
    updateSyncStatus('配置缺失', 'bg-yellow-400')
    return false
  }

  if (!isOnline()) {
    updateSyncStatus('网络断开', 'bg-red-400')
    return false
  }

  try {
    updateSyncStatus('同步中...', 'bg-blue-400')
    
    const response = await fetch(`http://${config.url}:${config.post}/api/fetch`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (response.ok) {
      const serverTodos = await response.json()
      if (Array.isArray(serverTodos.todos)) {
        store.todos = serverTodos.todos
      }
      updateSyncStatus('同步成功', 'bg-green-400')
      updateLastSyncTime()
      return true
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('拉取失败:', error)
    updateSyncStatus('拉取失败', 'bg-red-400')
    return false
  }
}

// 推送数据到服务端
const pushToServer = async () => {
  
  if (!config.url || !config.post || !config.token) {
    updateSyncStatus('配置缺失', 'bg-yellow-400')
    return false
  }

  if (!isOnline()) {
    updateSyncStatus('网络断开', 'bg-red-400')
    return false
  }

  try {
    updateSyncStatus('推送中...', 'bg-blue-400')
    console.log(JSON.stringify(store.todos))
    const response = await fetch(`http://${config.url}:${config.post}/api/update`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(store.todos)
    })

    if (response.ok) {
      pullFromServer()
      updateSyncStatus('同步成功', 'bg-green-400')
      updateLastSyncTime()
      return true
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('同步失败:', error)
    updateSyncStatus('同步失败', 'bg-red-400')
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
onMounted(() => {
  // 初始同步
  pullFromServer()
  
  // 启动定时同步
  startSyncTimer()
})

// 组件卸载时清理
onUnmounted(() => {
  if (syncTimer) {
    clearInterval(syncTimer)
  }
})

</script>
