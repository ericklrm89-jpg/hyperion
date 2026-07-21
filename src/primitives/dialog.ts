import { ConnectionManager } from '../connection'

export type DialogAction = 'accept' | 'dismiss'

export class DialogPrimitive {
  constructor(private cxn: ConnectionManager) {}

  async handleDialog(action: DialogAction, promptText?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cxn.removeListener('Page.javascriptDialogOpening', handler)
        reject(new Error('Dialog timeout'))
      }, 30000)

      const handler = async (params: any) => {
        clearTimeout(timeout)
        try {
          await this.cxn.call('Page.handleJavaScriptDialog', {
            accept: action === 'accept',
            promptText: promptText || params.defaultPrompt
          })
          resolve()
        } catch (err) {
          reject(err)
        }
      }

      this.cxn.once('Page.javascriptDialogOpening', handler)
    })
  }

  async waitForDialog(action: DialogAction, promptText?: string, timeout = 10000): Promise<void> {
    return this.handleDialog(action, promptText)
  }
}
