import { db, type Client, type TaxItem, type TaxPeriod } from './data-store';

// =============================================
// Simples Nacional — Anexo III (Serviços)
// Faixas de receita bruta acumulada 12 meses
// =============================================
const SIMPLES_ANEXO_III = [
  { max: 180000, aliquota: 6.0, deducao: 0 },
  { max: 360000, aliquota: 11.2, deducao: 9360 },
  { max: 720000, aliquota: 13.5, deducao: 17640 },
  { max: 1800000, aliquota: 16.0, deducao: 35640 },
  { max: 3600000, aliquota: 21.0, deducao: 125640 },
  { max: 4800000, aliquota: 33.0, deducao: 648000 },
];

// =============================================
// Lucro Presumido — Alíquotas presunção
// =============================================
const PRESUMIDO_SERVICOS_PRESUNCAO = 0.32; // 32% para serviços
const PRESUMIDO_COMERCIO_PRESUNCAO = 0.08; // 8% para comércio

const PRESUMIDO_IMPOSTOS = {
  IRPJ: 0.15,       // 15% sobre base presumida
  CSLL: 0.09,       // 9% sobre base presumida (32% serviços)
  PIS: 0.0065,       // 0.65% sobre faturamento
  COFINS: 0.03,      // 3% sobre faturamento
  ISS: 0.05,         // 2% a 5%, usando 5% como padrão
};

// =============================================
// Lucro Real — Alíquotas simplificadas
// =============================================
const REAL_IMPOSTOS = {
  IRPJ: 0.15,        // 15% sobre lucro real
  IRPJ_ADICIONAL: 0.10, // 10% sobre excedente R$ 20k/mês
  CSLL: 0.09,        // 9% sobre lucro real
  PIS: 0.0165,       // 1.65% não-cumulativo
  COFINS: 0.076,     // 7.6% não-cumulativo
};

export interface ApuracaoResult {
  regime: string;
  competence: string;
  receitaBruta: number;
  items: Omit<TaxItem, 'id' | 'guide_doc_id'>[];
  totalImpostos: number;
  aliquotaEfetiva: number;
  detalhes: { label: string; valor: string }[];
}

function getReceitaBruta(clientId: string, competence: string): number {
  const entries = db.entries.getByClient(clientId).filter(e => e.competence === competence);
  return entries
    .flatMap(e => e.lines)
    .filter(l => l.account_code.startsWith('4'))
    .reduce((sum, l) => sum + l.credit, 0);
}

function getDespesasTotal(clientId: string, competence: string): number {
  const entries = db.entries.getByClient(clientId).filter(e => e.competence === competence);
  return entries
    .flatMap(e => e.lines)
    .filter(l => l.account_code.startsWith('5'))
    .reduce((sum, l) => sum + l.debit, 0);
}

// Receita bruta acumulada 12 meses (simulação simplificada: multiplica por 12)
function getReceitaBruta12m(clientId: string, competence: string): number {
  const mensal = getReceitaBruta(clientId, competence);
  return mensal * 12; // Simplificação — em produção somaria os 12 meses reais
}

function calcularDueDate(competence: string, diaVencimento: number): string {
  const [year, month] = competence.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
}

// =============================================
// APURAÇÃO: MEI
// =============================================
function apurarMEI(clientId: string, competence: string): ApuracaoResult {
  const receita = getReceitaBruta(clientId, competence);
  // MEI paga valor fixo mensal (DAS-MEI)
  const dasMei = 75.90; // Valor aproximado 2025 (INSS + ISS/ICMS)
  const dueDate = calcularDueDate(competence, 20);

  return {
    regime: 'MEI',
    competence,
    receitaBruta: receita,
    items: [
      { type: 'DAS', value: dasMei, due_date: dueDate, paid: false },
    ],
    totalImpostos: dasMei,
    aliquotaEfetiva: receita > 0 ? (dasMei / receita) * 100 : 0,
    detalhes: [
      { label: 'Receita Bruta', valor: `R$ ${receita.toFixed(2)}` },
      { label: 'DAS-MEI (valor fixo)', valor: `R$ ${dasMei.toFixed(2)}` },
      { label: 'Inclui', valor: 'INSS + ISS/ICMS' },
    ],
  };
}

// =============================================
// APURAÇÃO: Simples Nacional
// =============================================
function apurarSimples(clientId: string, competence: string): ApuracaoResult {
  const receita = getReceitaBruta(clientId, competence);
  const rbt12 = getReceitaBruta12m(clientId, competence);

  // Encontrar faixa
  const faixa = SIMPLES_ANEXO_III.find(f => rbt12 <= f.max) || SIMPLES_ANEXO_III[SIMPLES_ANEXO_III.length - 1];

  // Alíquota efetiva = (RBT12 × Aliq - Ded) / RBT12
  const aliqEfetiva = rbt12 > 0 ? ((rbt12 * (faixa.aliquota / 100) - faixa.deducao) / rbt12) * 100 : 0;
  const valorDAS = receita * (aliqEfetiva / 100);
  const dueDate = calcularDueDate(competence, 20);

  return {
    regime: 'Simples Nacional',
    competence,
    receitaBruta: receita,
    items: [
      { type: 'DAS', value: valorDAS, due_date: dueDate, paid: false },
    ],
    totalImpostos: valorDAS,
    aliquotaEfetiva: aliqEfetiva,
    detalhes: [
      { label: 'Receita Bruta Mensal', valor: `R$ ${receita.toFixed(2)}` },
      { label: 'RBT12 (estimada)', valor: `R$ ${rbt12.toFixed(2)}` },
      { label: 'Faixa Anexo III', valor: `até R$ ${faixa.max.toLocaleString('pt-BR')}` },
      { label: 'Alíquota Nominal', valor: `${faixa.aliquota}%` },
      { label: 'Dedução', valor: `R$ ${faixa.deducao.toLocaleString('pt-BR')}` },
      { label: 'Alíquota Efetiva', valor: `${aliqEfetiva.toFixed(2)}%` },
      { label: 'Valor DAS', valor: `R$ ${valorDAS.toFixed(2)}` },
    ],
  };
}

// =============================================
// APURAÇÃO: Lucro Presumido
// =============================================
function apurarPresumido(clientId: string, competence: string): ApuracaoResult {
  const receita = getReceitaBruta(clientId, competence);
  const basePresumida = receita * PRESUMIDO_SERVICOS_PRESUNCAO;

  const irpj = basePresumida * PRESUMIDO_IMPOSTOS.IRPJ;
  const csll = basePresumida * PRESUMIDO_IMPOSTOS.CSLL;
  const pis = receita * PRESUMIDO_IMPOSTOS.PIS;
  const cofins = receita * PRESUMIDO_IMPOSTOS.COFINS;
  const iss = receita * PRESUMIDO_IMPOSTOS.ISS;

  const total = irpj + csll + pis + cofins + iss;
  const dueIRPJ = calcularDueDate(competence, 30);
  const duePISCOFINS = calcularDueDate(competence, 25);
  const dueISS = calcularDueDate(competence, 15);

  return {
    regime: 'Lucro Presumido',
    competence,
    receitaBruta: receita,
    items: [
      { type: 'IRPJ', value: irpj, due_date: dueIRPJ, paid: false },
      { type: 'CSLL', value: csll, due_date: dueIRPJ, paid: false },
      { type: 'PIS', value: pis, due_date: duePISCOFINS, paid: false },
      { type: 'COFINS', value: cofins, due_date: duePISCOFINS, paid: false },
      { type: 'ISS', value: iss, due_date: dueISS, paid: false },
    ],
    totalImpostos: total,
    aliquotaEfetiva: receita > 0 ? (total / receita) * 100 : 0,
    detalhes: [
      { label: 'Receita Bruta', valor: `R$ ${receita.toFixed(2)}` },
      { label: 'Presunção Serviços', valor: `${(PRESUMIDO_SERVICOS_PRESUNCAO * 100).toFixed(0)}%` },
      { label: 'Base Presumida', valor: `R$ ${basePresumida.toFixed(2)}` },
      { label: 'IRPJ (15% s/ base)', valor: `R$ ${irpj.toFixed(2)}` },
      { label: 'CSLL (9% s/ base)', valor: `R$ ${csll.toFixed(2)}` },
      { label: 'PIS (0,65% s/ fat.)', valor: `R$ ${pis.toFixed(2)}` },
      { label: 'COFINS (3% s/ fat.)', valor: `R$ ${cofins.toFixed(2)}` },
      { label: 'ISS (5% s/ fat.)', valor: `R$ ${iss.toFixed(2)}` },
    ],
  };
}

// =============================================
// APURAÇÃO: Lucro Real
// =============================================
function apurarReal(clientId: string, competence: string): ApuracaoResult {
  const receita = getReceitaBruta(clientId, competence);
  const despesas = getDespesasTotal(clientId, competence);
  const lucroReal = Math.max(receita - despesas, 0);

  const irpj = lucroReal * REAL_IMPOSTOS.IRPJ;
  const irpjAdicional = lucroReal > 20000 ? (lucroReal - 20000) * REAL_IMPOSTOS.IRPJ_ADICIONAL : 0;
  const csll = lucroReal * REAL_IMPOSTOS.CSLL;
  const pis = receita * REAL_IMPOSTOS.PIS;
  const cofins = receita * REAL_IMPOSTOS.COFINS;

  const total = irpj + irpjAdicional + csll + pis + cofins;
  const dueIRPJ = calcularDueDate(competence, 30);
  const duePISCOFINS = calcularDueDate(competence, 25);

  return {
    regime: 'Lucro Real',
    competence,
    receitaBruta: receita,
    items: [
      { type: 'IRPJ', value: irpj + irpjAdicional, due_date: dueIRPJ, paid: false },
      { type: 'CSLL', value: csll, due_date: dueIRPJ, paid: false },
      { type: 'PIS', value: pis, due_date: duePISCOFINS, paid: false },
      { type: 'COFINS', value: cofins, due_date: duePISCOFINS, paid: false },
    ],
    totalImpostos: total,
    aliquotaEfetiva: receita > 0 ? (total / receita) * 100 : 0,
    detalhes: [
      { label: 'Receita Bruta', valor: `R$ ${receita.toFixed(2)}` },
      { label: 'Despesas Dedutíveis', valor: `R$ ${despesas.toFixed(2)}` },
      { label: 'Lucro Real', valor: `R$ ${lucroReal.toFixed(2)}` },
      { label: 'IRPJ (15%)', valor: `R$ ${irpj.toFixed(2)}` },
      { label: 'IRPJ Adicional (10%)', valor: `R$ ${irpjAdicional.toFixed(2)}` },
      { label: 'CSLL (9%)', valor: `R$ ${csll.toFixed(2)}` },
      { label: 'PIS (1,65% não-cum.)', valor: `R$ ${pis.toFixed(2)}` },
      { label: 'COFINS (7,6% não-cum.)', valor: `R$ ${cofins.toFixed(2)}` },
    ],
  };
}

// =============================================
// DISPATCHER
// =============================================
export function apurarImpostos(clientId: string, competence: string): ApuracaoResult | null {
  const client = db.clients.getById(clientId);
  if (!client) return null;

  switch (client.regime) {
    case 'MEI': return apurarMEI(clientId, competence);
    case 'Simples': return apurarSimples(clientId, competence);
    case 'Presumido': return apurarPresumido(clientId, competence);
    case 'Real': return apurarReal(clientId, competence);
    default: return null;
  }
}

export function salvarApuracao(clientId: string, result: ApuracaoResult): void {
  const existing = db.taxPeriods.getByClient(clientId).find(tp => tp.competence === result.competence);

  const taxPeriod: TaxPeriod = {
    id: existing?.id || crypto.randomUUID(),
    client_id: clientId,
    competence: result.competence,
    status: 'apurado',
    items: result.items.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      guide_doc_id: null,
    })),
  };

  // Save via direct store manipulation
  const all = db.taxPeriods.getAll();
  const idx = all.findIndex(tp => tp.id === taxPeriod.id);
  if (idx >= 0) all[idx] = taxPeriod; else all.push(taxPeriod);
  localStorage.setItem('contabia_taxPeriods', JSON.stringify(all));

  db.auditLogs.add({
    entity: 'tax_period',
    entity_id: taxPeriod.id,
    action: existing ? 'update' : 'create',
    before_json: existing ? JSON.stringify(existing) : null,
    after_json: JSON.stringify(taxPeriod),
  });
}
