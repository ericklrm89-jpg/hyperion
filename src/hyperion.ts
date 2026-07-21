import { ConnectionManager } from './connection'
import { HyperionConfig, DEFAULT_CONFIG, ConnectionMode } from './config'
import {
  ClickPrimitive,
  TypePrimitive,
  ScreenshotPrimitive,
  NavigatePrimitive,
  ScrollPrimitive,
  SelectPrimitive,
  UploadPrimitive,
  DialogPrimitive
} from './primitives'

export class Hyperion {
  public cxn: ConnectionManager
  public click: ClickPrimitive
  public type: TypePrimitive
  public screenshot: ScreenshotPrimitive
  public navigate: NavigatePrimitive
  public scroll: ScrollPrimitive
  public select: SelectPrimitive
  public upload: UploadPrimitive
  public dialog: DialogPrimitive

  private config: HyperionConfig

  constructor(config?: Partial<HyperionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.cxn = new ConnectionManager(this.config)

    this.click = new ClickPrimitive(this.cxn)
    this.type = new TypePrimitive(this.cxn)
    this.screenshot = new ScreenshotPrimitive(this.cxn)
    this.navigate = new NavigatePrimitive(this.cxn)
    this.scroll = new ScrollPrimitive(this.cxn)
    this.select = new SelectPrimitive(this.cxn)
    this.upload = new UploadPrimitive(this.cxn)
    this.dialog = new DialogPrimitive(this.cxn)
  }

  async connect(): Promise<void> {
    await this.cxn.connect()
    await this.cxn.initDomains()
  }

  async disconnect(): Promise<void> {
    await this.cxn.disconnect()
  }

  async eval(expression: string): Promise<any> {
    return this.cxn.evaluate(expression)
  }

  async call(method: string, params?: any): Promise<any> {
    return this.cxn.call(method, params)
  }

  async getPageText(): Promise<string> {
    const result = await this.cxn.evaluate('document.body?.innerText || ""')
    return result?.value || ''
  }

  async getPageTitle(): Promise<string> {
    const result = await this.cxn.evaluate('document.title')
    return result?.value || ''
  }

  async getPageURL(): Promise<string> {
    const result = await this.cxn.evaluate('window.location.href')
    return result?.value || ''
  }
}
