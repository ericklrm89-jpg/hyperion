// Hyperion Browser Bridge - Extension Service Worker
// Communicates with Native Messaging Host to relay CDP commands

let nativePort: chrome.runtime.Port | null = null
let debuggerTargets: Map<number, { tabId: number; attached: boolean }> = new Map()
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

// Connect to Native Messaging Host
function connectNative(): void {
  if (nativePort) return

  try {
    nativePort = chrome.runtime.connectNative('com.hyperion.bridge')

    nativePort.onMessage.addListener((message: any) => {
      handleNativeMessage(message)
    })

    nativePort.onDisconnect.addListener(() => {
      console.error('Native host disconnected:', chrome.runtime.lastError?.message)
      nativePort = null
      attemptReconnect()
    })

    console.log('Connected to Hyperion Native Host')
    reconnectAttempts = 0
  } catch (err) {
    console.error('Failed to connect native host:', err)
    attemptReconnect()
  }
}

function attemptReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
  reconnectAttempts++
  setTimeout(connectNative, 5000 * reconnectAttempts)
}

// Handle messages from Native Host
async function handleNativeMessage(message: any): Promise<void> {
  const { id, method, params, targetId } = message

  if (method === 'connect') {
    // Connect to all existing tabs
    await attachToAllTabs()
    return
  }

  if (method === 'disconnect') {
    await detachAllTabs()
    return
  }

  // Route CDP command through chrome.debugger API
  if (id && method) {
    try {
      const tabId = targetId || (await getActiveTabId())
      if (!tabId) {
        sendNativeResponse(id, null, { code: -32002, message: 'No tab attached' })
        return
      }

      // Ensure debugger is attached
      if (!debuggerTargets.has(tabId) || !debuggerTargets.get(tabId)!.attached) {
        await attachDebugger(tabId)
      }

      // Send CDP command
      chrome.debugger.sendCommand(
        { tabId },
        method,
        params || {},
        (result) => {
          if (chrome.runtime.lastError) {
            sendNativeResponse(id, null, {
              code: -32000,
              message: chrome.runtime.lastError.message
            })
          } else {
            sendNativeResponse(id, result)
          }
        }
      )
    } catch (err: any) {
      sendNativeResponse(id, null, { code: -32603, message: err.message })
    }
    return
  }

  // Handle tab management commands
  if (method === 'Target.createTarget') {
    try {
      const tab = await chrome.tabs.create({ url: params?.url || 'about:blank', active: false })
      await attachDebugger(tab.id!)
      sendNativeResponse(id, { targetId: tab.id!.toString() })
    } catch (err: any) {
      sendNativeResponse(id, null, { code: -32603, message: err.message })
    }
    return
  }

  if (method === 'Target.closeTarget') {
    try {
      await chrome.tabs.remove(parseInt(targetId))
      debuggerTargets.delete(parseInt(targetId))
      sendNativeResponse(id, { success: true })
    } catch (err: any) {
      sendNativeResponse(id, null, { code: -32603, message: err.message })
    }
    return
  }

  if (method === 'Target.activateTarget') {
    try {
      await chrome.tabs.update(parseInt(targetId), { active: true })
      sendNativeResponse(id, { success: true })
    } catch (err: any) {
      sendNativeResponse(id, null, { code: -32603, message: err.message })
    }
    return
  }

  if (method === 'Target.getTargets') {
    try {
      const tabs = await chrome.tabs.query({})
      sendNativeResponse(id, {
        targetInfos: tabs.map(t => ({
          targetId: t.id!.toString(),
          type: 'page',
          title: t.title,
          url: t.url,
          attached: debuggerTargets.has(t.id!) && debuggerTargets.get(t.id!)!.attached
        }))
      })
    } catch (err: any) {
      sendNativeResponse(id, null, { code: -32603, message: err.message })
    }
    return
  }
}

// Send response back to Native Host
function sendNativeResponse(id: number, result?: any, error?: any): void {
  if (!nativePort) return
  const response: any = { id }
  if (error) {
    response.error = error
  } else {
    response.result = result
  }
  nativePort.postMessage(response)
}

// Debugger management
async function attachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      // Listen for CDP events and forward to native host
      chrome.debugger.onEvent.addListener(function onEvent(source, method, params) {
        if (source.tabId !== tabId) return

        if (nativePort) {
          nativePort.postMessage({
            method,
            params,
            targetId: tabId.toString()
          })
        }
      })

      debuggerTargets.set(tabId, { tabId, attached: true })
      resolve()
    })
  })
}

function detachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => {
      debuggerTargets.delete(tabId)
      resolve()
    })
  })
}

async function attachToAllTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id && !debuggerTargets.has(tab.id)) {
      try {
        await attachDebugger(tab.id)
      } catch (err) {
        console.error(`Failed to attach to tab ${tab.id}:`, err)
      }
    }
  }
}

async function detachAllTabs(): Promise<void> {
  for (const [tabId] of debuggerTargets) {
    try {
      await detachDebugger(tabId)
    } catch {}
  }
}

// Listen for new tabs
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id && nativePort) {
    // Wait for tab to load before attaching
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        attachDebugger(tabId).catch(() => {})
      }
    })
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  debuggerTargets.delete(tabId)
})

// Initialize
chrome.runtime.onStartup.addListener(() => {
  connectNative()
})

chrome.runtime.onInstalled.addListener(() => {
  connectNative()
})

// Connect on load
connectNative()

// Keep service worker alive
chrome.storage.local.get('keepAlive', () => {})
setInterval(() => {
  chrome.storage.local.set({ keepAlive: Date.now() })
}, 20000)
