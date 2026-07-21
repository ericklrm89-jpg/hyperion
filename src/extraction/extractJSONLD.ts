import { ConnectionManager } from '../connection'

export interface ExtractedJSONLD {
  jsonld: any[]
  microdata: any[]
  opengraph: Record<string, string>
  twitter: Record<string, string>
  meta: Record<string, string>
}

export class JSONLDExtractor {
  constructor(private cxn: ConnectionManager) {}

  async extract(): Promise<ExtractedJSONLD> {
    const result = await this.cxn.evaluate(`
      (() => {
        // JSON-LD
        const jsonld = [];
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
          try { jsonld.push(JSON.parse(script.textContent)); } catch {}
        });

        // Microdata
        const microdata = [];
        document.querySelectorAll('[itemscope]').forEach(el => {
          const item = { type: el.getAttribute('itemtype'), props: {} };
          el.querySelectorAll('[itemprop]').forEach(prop => {
            const name = prop.getAttribute('itemprop');
            const value = prop.getAttribute('content') || prop.textContent?.trim() || '';
            item.props[name] = value;
          });
          microdata.push(item);
        });

        // Open Graph
        const opengraph = {};
        document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
          opengraph[meta.getAttribute('property')] = meta.getAttribute('content');
        });

        // Twitter Cards
        const twitter = {};
        document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
          twitter[meta.getAttribute('name')] = meta.getAttribute('content');
        });

        // General meta
        const meta = {};
        document.querySelectorAll('meta[name]').forEach(m => {
          meta[m.getAttribute('name')] = m.getAttribute('content');
        });

        return JSON.stringify({ jsonld, microdata, opengraph, twitter, meta });
      })()
    `)

    return result?.value ? JSON.parse(result.value) : {
      jsonld: [], microdata: [], opengraph: {}, twitter: {}, meta: {}
    }
  }
}
