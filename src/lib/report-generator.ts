import { db, formatCurrency, formatCompetence, type JournalEntry, type ChartAccount } from './data-store';

export interface DRELine {
  code: string;
  name: string;
  value: number;
  level: number;
  isTotal?: boolean;
}

export interface BalanceteLine {
  code: string;
  name: string;
  debitBalance: number;
  creditBalance: number;
  debitMovement: number;
  creditMovement: number;
  level: number;
}

function getEntriesForPeriod(competence: string): JournalEntry[] {
  return db.entries.getAll().filter(e => e.competence === competence);
}

export function generateDRE(competence: string): { lines: DRELine[]; totalReceitas: number; totalDespesas: number; resultado: number } {
  const entries = getEntriesForPeriod(competence);
  const lines = entries.flatMap(e => e.lines);

  // Group by account
  const accountTotals = new Map<string, { code: string; name: string; debit: number; credit: number }>();

  for (const line of lines) {
    if (!line.account_code.startsWith('4') && !line.account_code.startsWith('5')) continue;
    const existing = accountTotals.get(line.account_code) || { code: line.account_code, name: line.account_name, debit: 0, credit: 0 };
    existing.debit += line.debit;
    existing.credit += line.credit;
    accountTotals.set(line.account_code, existing);
  }

  const dreLines: DRELine[] = [];
  let totalReceitas = 0;
  let totalDespesas = 0;

  // Receitas (code starts with 4)
  dreLines.push({ code: '4', name: 'RECEITAS', value: 0, level: 1, isTotal: true });
  const receitas = [...accountTotals.entries()]
    .filter(([code]) => code.startsWith('4'))
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [, acc] of receitas) {
    const value = acc.credit - acc.debit;
    totalReceitas += value;
    dreLines.push({ code: acc.code, name: acc.name, value, level: 2 });
  }
  dreLines[0].value = totalReceitas;

  // Despesas (code starts with 5)
  dreLines.push({ code: '5', name: 'DESPESAS', value: 0, level: 1, isTotal: true });
  const despesasIdx = dreLines.length - 1;
  const despesas = [...accountTotals.entries()]
    .filter(([code]) => code.startsWith('5'))
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [, acc] of despesas) {
    const value = acc.debit - acc.credit;
    totalDespesas += value;
    dreLines.push({ code: acc.code, name: acc.name, value, level: 2 });
  }
  dreLines[despesasIdx].value = totalDespesas;

  const resultado = totalReceitas - totalDespesas;
  dreLines.push({ code: '', name: 'RESULTADO DO EXERCÍCIO', value: resultado, level: 1, isTotal: true });

  return { lines: dreLines, totalReceitas, totalDespesas, resultado };
}

export function generateBalancete(competence: string): { lines: BalanceteLine[]; totalDebit: number; totalCredit: number } {
  const entries = getEntriesForPeriod(competence);
  const allLines = entries.flatMap(e => e.lines);

  const accountMap = new Map<string, { code: string; name: string; debit: number; credit: number }>();

  for (const line of allLines) {
    const existing = accountMap.get(line.account_code) || { code: line.account_code, name: line.account_name, debit: 0, credit: 0 };
    existing.debit += line.debit;
    existing.credit += line.credit;
    accountMap.set(line.account_code, existing);
  }

  const balanceteLines: BalanceteLine[] = [...accountMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, acc]) => {
      const saldoDevedor = acc.debit > acc.credit ? acc.debit - acc.credit : 0;
      const saldoCredor = acc.credit > acc.debit ? acc.credit - acc.debit : 0;
      return {
        code: acc.code,
        name: acc.name,
        debitMovement: acc.debit,
        creditMovement: acc.credit,
        debitBalance: saldoDevedor,
        creditBalance: saldoCredor,
        level: acc.code.split('.').length,
      };
    });

  const totalDebit = balanceteLines.reduce((s, l) => s + l.debitBalance, 0);
  const totalCredit = balanceteLines.reduce((s, l) => s + l.creditBalance, 0);

  return { lines: balanceteLines, totalDebit, totalCredit };
}

export function printReport(title: string, competence: string, bodyHtml: string) {
  const comp = formatCompetence(competence);
  const now = new Date().toLocaleString('pt-BR');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${comp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a2e; padding-bottom: 15px; }
    .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 11px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f0f0f5; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
    th.right, td.right { text-align: right; }
    td { padding: 6px 10px; border-bottom: 1px solid #eee; }
    tr.total { font-weight: 700; background: #f8f8fc; }
    tr.total td { border-top: 2px solid #1a1a2e; border-bottom: 2px solid #1a1a2e; }
    tr.resultado td { font-size: 13px; }
    .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Competência: ${comp} &nbsp;|&nbsp; Gerado em: ${now}</p>
    <p>ContabIA Local — Organiza, confere e prova.</p>
  </div>
  ${bodyHtml}
  <div class="footer">
    Documento gerado automaticamente pelo ContabIA Local. Este relatório é informativo e não substitui análise profissional.
  </div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export function buildDREHtml(competence: string): string {
  const { lines } = generateDRE(competence);
  let rows = '';
  for (const line of lines) {
    const cls = line.isTotal ? 'total' : '';
    const resultCls = line.name === 'RESULTADO DO EXERCÍCIO' ? ' resultado' : '';
    const indent = line.isTotal ? '' : `padding-left: ${line.level * 16}px;`;
    const valueColor = line.name === 'RESULTADO DO EXERCÍCIO' ? (line.value >= 0 ? 'color: #16a34a;' : 'color: #dc2626;') : '';
    rows += `<tr class="${cls}${resultCls}"><td style="${indent}">${line.code ? line.code + ' — ' : ''}${line.name}</td><td class="right" style="${valueColor}">${formatCurrency(line.value)}</td></tr>`;
  }
  return `<table><thead><tr><th>Conta</th><th class="right">Valor (R$)</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildBalanceteHtml(competence: string): string {
  const { lines, totalDebit, totalCredit } = generateBalancete(competence);
  let rows = '';
  for (const line of lines) {
    rows += `<tr>
      <td>${line.code}</td>
      <td>${line.name}</td>
      <td class="right">${formatCurrency(line.debitMovement)}</td>
      <td class="right">${formatCurrency(line.creditMovement)}</td>
      <td class="right">${line.debitBalance > 0 ? formatCurrency(line.debitBalance) : '—'}</td>
      <td class="right">${line.creditBalance > 0 ? formatCurrency(line.creditBalance) : '—'}</td>
    </tr>`;
  }
  rows += `<tr class="total">
    <td colspan="2">TOTAL</td>
    <td class="right">—</td><td class="right">—</td>
    <td class="right">${formatCurrency(totalDebit)}</td>
    <td class="right">${formatCurrency(totalCredit)}</td>
  </tr>`;
  return `<table><thead><tr><th>Código</th><th>Conta</th><th class="right">Débito</th><th class="right">Crédito</th><th class="right">Saldo Dev.</th><th class="right">Saldo Cred.</th></tr></thead><tbody>${rows}</tbody></table>`;
}
