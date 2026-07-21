import { ConnectionManager } from '../connection'

export interface ExtractedTable {
  headers: string[]
  rows: Record<string, string>[]
  caption?: string
}

export class TableExtractor {
  constructor(private cxn: ConnectionManager) {}

  async extract(selector?: string): Promise<ExtractedTable[]> {
    const tables = await this.cxn.evaluate(`
      (() => {
        const tables = ${selector ? `[document.querySelector('${selector.replace(/'/g, "\\'")}')].filter(Boolean)` : 'document.querySelectorAll("table")'};
        return JSON.stringify(Array.from(tables).map(table => {
          // Headers
          const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
          const headers = headerRow
            ? Array.from(headerRow.querySelectorAll('th, td')).map(th => th.textContent?.trim() || '')
            : [];

          // Rows
          const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
          const rows = Array.from(bodyRows).map(row => {
            const cells = row.querySelectorAll('td, th');
            const rowData = {};
            cells.forEach((cell, i) => {
              const key = headers[i] || \`col\${i}\`;
              rowData[key] = cell.textContent?.trim() || '';
            });
            return rowData;
          });

          return {
            headers,
            rows,
            caption: table.querySelector('caption')?.textContent?.trim() || ''
          };
        }))
      })()
    `)

    return tables?.value ? JSON.parse(tables.value) : []
  }
}
