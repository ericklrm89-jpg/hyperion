// Popup script for Hyperion Browser Extension
document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status')
  const tabCountEl = document.getElementById('tabCount')
  const reconnectBtn = document.getElementById('reconnect')

  async function updateStatus() {
    const tabs = await chrome.tabs.query({})
    tabCountEl!.textContent = tabs.length.toString()

    // Check if native host is connected by pinging
    const backgroundReady = await chrome.runtime.sendMessage({ type: 'ping' }).catch(() => false)
    if (backgroundReady) {
      statusEl!.textContent = 'Connected'
      statusEl!.className = 'status connected'
    } else {
      statusEl!.textContent = 'Disconnected'
      statusEl!.className = 'status disconnected'
    }
  }

  reconnectBtn?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'reconnect' })
    setTimeout(updateStatus, 1000)
  })

  updateStatus()
  setInterval(updateStatus, 3000)
})
