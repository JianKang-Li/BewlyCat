import { watch } from 'vue'

import { settings } from '~/logic'

// 高倍速选项列表（在原生倍速基础上扩展，原生最高2x）
const HIGH_SPEED_OPTIONS = [
  { value: 2.5, label: '2.5x' },
  { value: 3, label: '3.0x' },
  { value: 4, label: '4.0x' },
  { value: 5, label: '5.0x' },
]

let isInjected = false
let addedItems: HTMLLIElement[] = []

// 查找原生倍速菜单容器（包含按钮和菜单）
function findPlaybackRateContainer(): HTMLElement | null {
  const container = document.querySelector('.bpx-player-ctrl-playbackrate')
  if (container)
    return container as HTMLElement

  const oldContainer = document.querySelector('.bilibili-player-video-btn-speed')
  if (oldContainer)
    return oldContainer as HTMLElement

  return null
}
function findPlaybackRateMenu(): HTMLElement | null {
  // 新版播放器倍速菜单
  const menu = document.querySelector('.bpx-player-ctrl-playbackrate-menu')
  if (menu)
    return menu as HTMLElement

  // 旧版播放器倍速菜单
  const oldMenu = document.querySelector('.bilibili-player-video-btn-speed-menu')
  if (oldMenu)
    return oldMenu as HTMLElement

  return null
}

// 查找倍速显示元素
function findPlaybackRateResult(): HTMLElement | null {
  const result = document.querySelector('.bpx-player-ctrl-playbackrate-result')
  if (result)
    return result as HTMLElement

  const oldResult = document.querySelector('.bilibili-player-video-btn-speed-text')
  if (oldResult)
    return oldResult as HTMLElement

  return null
}

// 创建高倍速菜单项
function createHighSpeedMenuItem(option: { value: number, label: string }): HTMLLIElement {
  const item = document.createElement('li')
  // 只使用原生类名，确保样式完全一致
  item.className = 'bpx-player-ctrl-playbackrate-menu-item'
  item.setAttribute('data-value', String(option.value))
  item.textContent = option.label

  // 点击事件处理
  item.addEventListener('click', (e) => {
    e.stopPropagation()
    e.preventDefault()

    // 获取视频元素并设置倍速
    const video = document.querySelector('video')
    if (video) {
      video.playbackRate = option.value

      // 更新倍速显示
      const resultEl = findPlaybackRateResult()
      if (resultEl) {
        resultEl.textContent = `${option.value}x`
      }

      // 更新菜单项选中状态
      updateActiveState(option.value)

      // 触发菜单关闭
      const container = findPlaybackRateContainer()
      if (container) {
        container.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
      }
    }
  })

  return item
}

// 更新菜单项选中状态
function updateActiveState(currentSpeed: number) {
  const menu = findPlaybackRateMenu()
  if (!menu)
    return

  // 更新所有菜单项的选中状态
  const allItems = menu.querySelectorAll('.bpx-player-ctrl-playbackrate-menu-item, .bilibili-player-video-btn-speed-menu-item')
  allItems.forEach((item) => {
    const value = Number(item.getAttribute('data-value'))
    if (Math.abs(value - currentSpeed) < 0.01) {
      item.classList.add('bpx-state-active', 'active')
    }
    else {
      item.classList.remove('bpx-state-active', 'active')
    }
  })
}

// 注入高倍速选项到原生菜单
function injectHighSpeedOptions() {
  if (isInjected || !settings.value.enableHighSpeedMode)
    return

  const menu = findPlaybackRateMenu()
  if (!menu)
    return

  // 检查是否已添加
  if (menu.querySelector('[data-value="5"]'))
    return

  // 清空之前添加的项记录
  addedItems = []

  // 在菜单开头添加高倍速选项（从高到低排序：5x, 4x, 3x, 2.5x）
  for (const option of HIGH_SPEED_OPTIONS) {
    const item = createHighSpeedMenuItem(option)
    menu.insertBefore(item, menu.firstChild)
    addedItems.push(item)
  }

  isInjected = true
  console.log('[BewlyHighSpeed] High speed options (2.5x-5x) injected into native menu')

  // 监听视频倍速变化，更新选中状态
  setupVideoRateListener()
}

// 移除注入的高倍速选项
function removeHighSpeedOptions() {
  addedItems.forEach((item) => {
    if (item.parentElement && item) {
      item.parentElement.removeChild(item)
    }
  })
  addedItems = []

  isInjected = false
}

// 监听视频倍速变化
function setupVideoRateListener() {
  const video = document.querySelector('video')
  if (!video)
    return

  // 避免重复添加监听器
  if (video.hasAttribute('bewly-hs-native-listener'))
    return

  video.setAttribute('bewly-hs-native-listener', 'true')

  video.addEventListener('ratechange', () => {
    updateActiveState(video.playbackRate)
  })
}

// 初始化
export function initHighSpeedControl() {
  // 检查是否为直播页面
  if (location.hostname.includes('live.bilibili.com'))
    return

  // 监听设置变化
  watch(() => settings.value.enableHighSpeedMode, (enabled) => {
    if (enabled) {
      injectHighSpeedOptions()
    }
    else {
      removeHighSpeedOptions()
    }
  }, { immediate: true })

  // 定期检查并注入（处理 SPA 页面切换和播放器重新加载）
  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      isInjected = false
    }

    if (settings.value.enableHighSpeedMode && !isInjected) {
      injectHighSpeedOptions()
    }
  }, 1000)
}
