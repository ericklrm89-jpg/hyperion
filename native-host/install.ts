// Install Native Messaging Host for Chrome
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const HOST_NAME = 'com.hyperion.bridge'

function getNativeManifestPath(browser: string): string {
  switch (process.platform) {
    case 'win32': {
      // Windows: registry-based
      return `HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`
    }
    case 'darwin': {
      const home = process.env.HOME
      return `${home}/Library/Application Support/Google/Chrome/NativeMessagingHosts/${HOST_NAME}.json`
    }
    default: {
      const home = process.env.HOME
      return `${home}/.config/google-chrome/NativeMessagingHosts/${HOST_NAME}.json`
    }
  }
}

function install(): void {
  const hostPath = path.resolve(__dirname, 'index.ts')
  const nativeHostPath = path.resolve(__dirname, '..', 'dist', 'native-host', 'index.js')

  const manifest = {
    name: HOST_NAME,
    description: 'Hyperion Browser Native Messaging Host',
    path: nativeHostPath,
    type: 'stdio',
    allowed_origins: [
      `chrome-extension://${getExtensionId()}/`
    ]
  }

  if (process.platform === 'win32') {
    // Windows: write to registry
    const manifestDir = path.join(process.env.LOCALAPPDATA!, 'Hyperion', 'NativeMessagingHosts')
    fs.mkdirSync(manifestDir, { recursive: true })

    const manifestPath = path.join(manifestDir, `${HOST_NAME}.json`)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    // Register in registry
    const regCmd = `reg add "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}" /ve /t REG_SZ /d "${manifestPath.replace(/\//g, '\\')}" /f`
    execSync(regCmd)

    console.log(`Installed Native Messaging Host at ${manifestPath}`)
  } else {
    // macOS/Linux: write manifest file
    const manifestDir = path.dirname(getNativeManifestPath('chrome'))
    fs.mkdirSync(manifestDir, { recursive: true })
    fs.writeFileSync(getNativeManifestPath('chrome'), JSON.stringify(manifest, null, 2))
    console.log(`Installed Native Messaging Host at ${getNativeManifestPath('chrome')}`)
  }
}

function getExtensionId(): string {
  // Read from .extension-id file or prompt user
  const idFile = path.resolve(__dirname, '..', '.extension-id')
  if (fs.existsSync(idFile)) {
    return fs.readFileSync(idFile, 'utf-8').trim()
  }
  console.error('Please create .extension-id file with your Chrome Extension ID')
  console.error('Or set HYPERION_EXTENSION_ID environment variable')
  return process.env.HYPERION_EXTENSION_ID || 'abcdefghijklmnopabcdefghijklmnop'
}

if (require.main === module) {
  install()
}
