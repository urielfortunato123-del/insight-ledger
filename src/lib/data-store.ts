// Local-first data store using localStorage (SQLite-like interface)
// Will be migrated to actual SQLite/IndexedDB in future

export interface Client {
  id: string;
  name: string;
  cnpj_cpf: string;
  regime: 'MEI' | 'Simples' | 'Presumido' | 'Real';
  cnae: string;
  ie: string;
  im: string;
  address: string;
  phone: string;
  email: string;
  bank_accounts: BankAccount[];
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  bank: string;
  agency: string;
  account: string;
  type: 'corrente' | 'poupanca';
}

export interface Document {
  id: string;
  client_id: string;
  type: 'nf_entrada' | 'nf_saida' | 'extrato' | 'boleto' | 'guia' | 'contrato' | 'outro';
  competence: string; // YYYY-MM
  date_doc: string;
  value: number;
  description: string;
  file_name: string;
  sha256: string;
  ocr_status: 'pending' | 'processing' | 'done' | 'error';
  ocr_text: string;
  extracted_fields: Record<string, string>;
  created_at: string;
}

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: 'ativo' | 'passivo' | 'receita' | 'despesa' | 'patrimonio';
  parent_id: string | null;
  level: number;
}

export interface JournalEntry {
  id: string;
  client_id: string;
  date: string;
  competence: string;
  memo: string;
  lines: JournalLine[];
  created_at: string;
}

export interface JournalLine {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  document_id: string | null;
}

export interface BankTransaction {
  id: string;
  client_id: string;
  bank_account_id: string;
  date: string;
  description: string;
  amount: number;
  matched: boolean;
  match_entry_id: string | null;
  match_confidence: number;
  imported_from: string;
  created_at: string;
}

export interface TaxPeriod {
  id: string;
  client_id: string;
  competence: string;
  status: 'a_apurar' | 'apurado' | 'pago' | 'atrasado';
  items: TaxItem[];
}

export interface TaxItem {
  id: string;
  type: 'DAS' | 'ISS' | 'ICMS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'retencao';
  value: number;
  due_date: string;
  paid: boolean;
  guide_doc_id: string | null;
}

export interface Obligation {
  id: string;
  client_id: string;
  name: string;
  regime: string;
  competence: string;
  due_date: string;
  status: 'pendente' | 'enviada' | 'atrasada';
  notes: string;
}

export interface AuditLog {
  id: string;
  at: string;
  entity: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  before_json: string | null;
  after_json: string;
  hash: string;
}

export interface AIAlert {
  id: string;
  type: 'duplicidade' | 'valor_atipico' | 'competencia_estranha' | 'guia_faltando' | 'classificacao';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  source_ids: string[];
  confidence: number;
  dismissed: boolean;
  created_at: string;
}

// Store helpers
function getStore<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(`contabia_${key}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(`contabia_${key}`, JSON.stringify(data));
}

export const db = {
  clients: {
    getAll: (): Client[] => getStore('clients'),
    getById: (id: string): Client | undefined => getStore<Client>('clients').find(c => c.id === id),
    save: (client: Client) => {
      const all = getStore<Client>('clients');
      const idx = all.findIndex(c => c.id === client.id);
      if (idx >= 0) all[idx] = client; else all.push(client);
      setStore('clients', all);
    },
    delete: (id: string) => {
      setStore('clients', getStore<Client>('clients').filter(c => c.id !== id));
    },
  },
  documents: {
    getAll: (): Document[] => getStore('documents'),
    getByClient: (clientId: string): Document[] => getStore<Document>('documents').filter(d => d.client_id === clientId),
    save: (doc: Document) => {
      const all = getStore<Document>('documents');
      const idx = all.findIndex(d => d.id === doc.id);
      if (idx >= 0) all[idx] = doc; else all.push(doc);
      setStore('documents', all);
    },
  },
  entries: {
    getAll: (): JournalEntry[] => getStore('entries'),
    getByClient: (clientId: string): JournalEntry[] => getStore<JournalEntry>('entries').filter(e => e.client_id === clientId),
    save: (entry: JournalEntry) => {
      const all = getStore<JournalEntry>('entries');
      const idx = all.findIndex(e => e.id === entry.id);
      if (idx >= 0) all[idx] = entry; else all.push(entry);
      setStore('entries', all);
    },
  },
  transactions: {
    getAll: (): BankTransaction[] => getStore('transactions'),
    getByClient: (clientId: string): BankTransaction[] => getStore<BankTransaction>('transactions').filter(t => t.client_id === clientId),
    save: (tx: BankTransaction) => {
      const all = getStore<BankTransaction>('transactions');
      const idx = all.findIndex(t => t.id === tx.id);
      if (idx >= 0) all[idx] = tx; else all.push(tx);
      setStore('transactions', all);
    },
  },
  taxPeriods: {
    getAll: (): TaxPeriod[] => getStore('taxPeriods'),
    getByClient: (clientId: string): TaxPeriod[] => getStore<TaxPeriod>('taxPeriods').filter(t => t.client_id === clientId),
    save: (tp: TaxPeriod) => {
      const all = getStore<TaxPeriod>('taxPeriods');
      const idx = all.findIndex(t => t.id === tp.id);
      if (idx >= 0) all[idx] = tp; else all.push(tp);
      setStore('taxPeriods', all);
    },
  },
  obligations: {
    getAll: (): Obligation[] => getStore('obligations'),
    getByClient: (clientId: string): Obligation[] => getStore<Obligation>('obligations').filter(o => o.client_id === clientId),
  },
  chartAccounts: {
    getAll: (): ChartAccount[] => getStore('chartAccounts'),
  },
  auditLogs: {
    getAll: (): AuditLog[] => getStore('auditLogs'),
    add: (log: Omit<AuditLog, 'id' | 'at' | 'hash'>) => {
      const all = getStore<AuditLog>('auditLogs');
      const entry: AuditLog = {
        ...log,
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        hash: '', // Will be computed
      };
      // Simple hash for audit trail
      entry.hash = btoa(JSON.stringify({ ...entry, hash: '' })).slice(0, 44);
      all.push(entry);
      setStore('auditLogs', all);
    },
  },
  aiAlerts: {
    getAll: (): AIAlert[] => getStore('aiAlerts'),
  },
};

// Check if seed data exists
export function hasSeedData(): boolean {
  return getStore<Client>('clients').length > 0;
}

export function loadSeedData(): void {
  if (hasSeedData()) return;

  const clientId = 'cli_demo_001';
  const bankAccId = 'ba_001';

  // Demo client
  const client: Client = {
    id: clientId,
    name: 'Tech Solutions Ltda',
    cnpj_cpf: '12.345.678/0001-90',
    regime: 'Simples',
    cnae: '6201-5/01',
    ie: '123.456.789',
    im: '987654',
    address: 'Rua da Tecnologia, 100 - São Paulo/SP',
    phone: '(11) 99999-1234',
    email: 'contato@techsolutions.com.br',
    bank_accounts: [
      { id: bankAccId, bank: 'Banco do Brasil', agency: '1234-5', account: '67890-1', type: 'corrente' },
    ],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };
  setStore('clients', [client]);

  // Chart of accounts
  const accounts: ChartAccount[] = [
    { id: 'acc_1', code: '1', name: 'ATIVO', type: 'ativo', parent_id: null, level: 1 },
    { id: 'acc_11', code: '1.1', name: 'Ativo Circulante', type: 'ativo', parent_id: 'acc_1', level: 2 },
    { id: 'acc_111', code: '1.1.1', name: 'Caixa e Equivalentes', type: 'ativo', parent_id: 'acc_11', level: 3 },
    { id: 'acc_112', code: '1.1.2', name: 'Bancos c/ Movimento', type: 'ativo', parent_id: 'acc_11', level: 3 },
    { id: 'acc_113', code: '1.1.3', name: 'Clientes a Receber', type: 'ativo', parent_id: 'acc_11', level: 3 },
    { id: 'acc_12', code: '1.2', name: 'Ativo Não Circulante', type: 'ativo', parent_id: 'acc_1', level: 2 },
    { id: 'acc_121', code: '1.2.1', name: 'Imobilizado', type: 'ativo', parent_id: 'acc_12', level: 3 },
    { id: 'acc_2', code: '2', name: 'PASSIVO', type: 'passivo', parent_id: null, level: 1 },
    { id: 'acc_21', code: '2.1', name: 'Passivo Circulante', type: 'passivo', parent_id: 'acc_2', level: 2 },
    { id: 'acc_211', code: '2.1.1', name: 'Fornecedores', type: 'passivo', parent_id: 'acc_21', level: 3 },
    { id: 'acc_212', code: '2.1.2', name: 'Impostos a Pagar', type: 'passivo', parent_id: 'acc_21', level: 3 },
    { id: 'acc_213', code: '2.1.3', name: 'Salários a Pagar', type: 'passivo', parent_id: 'acc_21', level: 3 },
    { id: 'acc_3', code: '3', name: 'PATRIMÔNIO LÍQUIDO', type: 'patrimonio', parent_id: null, level: 1 },
    { id: 'acc_31', code: '3.1', name: 'Capital Social', type: 'patrimonio', parent_id: 'acc_3', level: 2 },
    { id: 'acc_4', code: '4', name: 'RECEITAS', type: 'receita', parent_id: null, level: 1 },
    { id: 'acc_41', code: '4.1', name: 'Receita de Serviços', type: 'receita', parent_id: 'acc_4', level: 2 },
    { id: 'acc_42', code: '4.2', name: 'Receita de Vendas', type: 'receita', parent_id: 'acc_4', level: 2 },
    { id: 'acc_5', code: '5', name: 'DESPESAS', type: 'despesa', parent_id: null, level: 1 },
    { id: 'acc_51', code: '5.1', name: 'Despesas Operacionais', type: 'despesa', parent_id: 'acc_5', level: 2 },
    { id: 'acc_511', code: '5.1.1', name: 'Aluguel', type: 'despesa', parent_id: 'acc_51', level: 3 },
    { id: 'acc_512', code: '5.1.2', name: 'Energia Elétrica', type: 'despesa', parent_id: 'acc_51', level: 3 },
    { id: 'acc_513', code: '5.1.3', name: 'Internet e Telefone', type: 'despesa', parent_id: 'acc_51', level: 3 },
    { id: 'acc_514', code: '5.1.4', name: 'Material de Escritório', type: 'despesa', parent_id: 'acc_51', level: 3 },
    { id: 'acc_52', code: '5.2', name: 'Despesas com Pessoal', type: 'despesa', parent_id: 'acc_5', level: 2 },
    { id: 'acc_521', code: '5.2.1', name: 'Salários e Ordenados', type: 'despesa', parent_id: 'acc_52', level: 3 },
    { id: 'acc_53', code: '5.3', name: 'Impostos e Taxas', type: 'despesa', parent_id: 'acc_5', level: 2 },
  ];
  setStore('chartAccounts', accounts);

  // Demo documents
  const docs: Document[] = [
    { id: 'doc_001', client_id: clientId, type: 'nf_saida', competence: '2025-01', date_doc: '2025-01-05', value: 15000, description: 'NF 001 - Serviço de Consultoria TI', file_name: 'NF_001_2025.pdf', sha256: 'abc123', ocr_status: 'done', ocr_text: 'Nota Fiscal de Serviço...', extracted_fields: { cnpj: '12.345.678/0001-90', numero: '001' }, created_at: '2025-01-05T10:00:00Z' },
    { id: 'doc_002', client_id: clientId, type: 'nf_saida', competence: '2025-01', date_doc: '2025-01-15', value: 8500, description: 'NF 002 - Desenvolvimento de Software', file_name: 'NF_002_2025.pdf', sha256: 'def456', ocr_status: 'done', ocr_text: 'Nota Fiscal de Serviço...', extracted_fields: { cnpj: '12.345.678/0001-90', numero: '002' }, created_at: '2025-01-15T10:00:00Z' },
    { id: 'doc_003', client_id: clientId, type: 'nf_entrada', competence: '2025-01', date_doc: '2025-01-10', value: 3500, description: 'NF Entrada - Compra de Equipamentos', file_name: 'NFE_003_2025.pdf', sha256: 'ghi789', ocr_status: 'done', ocr_text: 'Nota Fiscal Eletrônica...', extracted_fields: { cnpj: '98.765.432/0001-10', numero: '4521' }, created_at: '2025-01-10T10:00:00Z' },
    { id: 'doc_004', client_id: clientId, type: 'boleto', competence: '2025-01', date_doc: '2025-01-08', value: 2800, description: 'Aluguel Janeiro/2025', file_name: 'boleto_aluguel_jan.pdf', sha256: 'jkl012', ocr_status: 'done', ocr_text: 'Boleto Bancário...', extracted_fields: {}, created_at: '2025-01-08T10:00:00Z' },
    { id: 'doc_005', client_id: clientId, type: 'guia', competence: '2025-01', date_doc: '2025-01-20', value: 1234.56, description: 'DAS Janeiro/2025', file_name: 'DAS_jan2025.pdf', sha256: 'mno345', ocr_status: 'done', ocr_text: 'Documento de Arrecadação do Simples Nacional...', extracted_fields: { periodo: '01/2025', valor: '1234.56' }, created_at: '2025-01-20T10:00:00Z' },
    { id: 'doc_006', client_id: clientId, type: 'extrato', competence: '2025-01', date_doc: '2025-01-31', value: 0, description: 'Extrato BB Janeiro/2025', file_name: 'extrato_bb_jan2025.pdf', sha256: 'pqr678', ocr_status: 'done', ocr_text: 'Extrato Bancário...', extracted_fields: {}, created_at: '2025-01-31T10:00:00Z' },
    { id: 'doc_007', client_id: clientId, type: 'nf_saida', competence: '2025-02', date_doc: '2025-02-03', value: 12000, description: 'NF 003 - Suporte Mensal TI', file_name: 'NF_003_2025.pdf', sha256: 'stu901', ocr_status: 'done', ocr_text: 'Nota Fiscal...', extracted_fields: { cnpj: '12.345.678/0001-90', numero: '003' }, created_at: '2025-02-03T10:00:00Z' },
    { id: 'doc_008', client_id: clientId, type: 'nf_entrada', competence: '2025-02', date_doc: '2025-02-05', value: 450, description: 'NF Entrada - Material de Escritório', file_name: 'NFE_mat_fev2025.pdf', sha256: 'vwx234', ocr_status: 'pending', ocr_text: '', extracted_fields: {}, created_at: '2025-02-05T10:00:00Z' },
    { id: 'doc_009', client_id: clientId, type: 'contrato', competence: '2025-01', date_doc: '2025-01-02', value: 0, description: 'Contrato de Locação Comercial', file_name: 'contrato_locacao.pdf', sha256: 'yza567', ocr_status: 'done', ocr_text: 'Contrato de Locação...', extracted_fields: {}, created_at: '2025-01-02T10:00:00Z' },
    { id: 'doc_010', client_id: clientId, type: 'boleto', competence: '2025-02', date_doc: '2025-02-08', value: 2800, description: 'Aluguel Fevereiro/2025', file_name: 'boleto_aluguel_fev.pdf', sha256: 'bcd890', ocr_status: 'pending', ocr_text: '', extracted_fields: {}, created_at: '2025-02-08T10:00:00Z' },
  ];
  setStore('documents', docs);

  // Demo journal entries
  const entries: JournalEntry[] = [
    { id: 'je_001', client_id: clientId, date: '2025-01-05', competence: '2025-01', memo: 'Receita NF 001 - Consultoria TI', lines: [
      { id: 'jl_001', account_id: 'acc_113', account_code: '1.1.3', account_name: 'Clientes a Receber', debit: 15000, credit: 0, document_id: 'doc_001' },
      { id: 'jl_002', account_id: 'acc_41', account_code: '4.1', account_name: 'Receita de Serviços', debit: 0, credit: 15000, document_id: 'doc_001' },
    ], created_at: '2025-01-05T10:00:00Z' },
    { id: 'je_002', client_id: clientId, date: '2025-01-07', competence: '2025-01', memo: 'Recebimento NF 001 via banco', lines: [
      { id: 'jl_003', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 15000, credit: 0, document_id: null },
      { id: 'jl_004', account_id: 'acc_113', account_code: '1.1.3', account_name: 'Clientes a Receber', debit: 0, credit: 15000, document_id: null },
    ], created_at: '2025-01-07T10:00:00Z' },
    { id: 'je_003', client_id: clientId, date: '2025-01-08', competence: '2025-01', memo: 'Pagamento aluguel janeiro', lines: [
      { id: 'jl_005', account_id: 'acc_511', account_code: '5.1.1', account_name: 'Aluguel', debit: 2800, credit: 0, document_id: 'doc_004' },
      { id: 'jl_006', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 0, credit: 2800, document_id: 'doc_004' },
    ], created_at: '2025-01-08T10:00:00Z' },
    { id: 'je_004', client_id: clientId, date: '2025-01-10', competence: '2025-01', memo: 'Compra de equipamentos', lines: [
      { id: 'jl_007', account_id: 'acc_121', account_code: '1.2.1', account_name: 'Imobilizado', debit: 3500, credit: 0, document_id: 'doc_003' },
      { id: 'jl_008', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 0, credit: 3500, document_id: 'doc_003' },
    ], created_at: '2025-01-10T10:00:00Z' },
    { id: 'je_005', client_id: clientId, date: '2025-01-15', competence: '2025-01', memo: 'Receita NF 002 - Desenvolvimento', lines: [
      { id: 'jl_009', account_id: 'acc_113', account_code: '1.1.3', account_name: 'Clientes a Receber', debit: 8500, credit: 0, document_id: 'doc_002' },
      { id: 'jl_010', account_id: 'acc_41', account_code: '4.1', account_name: 'Receita de Serviços', debit: 0, credit: 8500, document_id: 'doc_002' },
    ], created_at: '2025-01-15T10:00:00Z' },
    { id: 'je_006', client_id: clientId, date: '2025-01-15', competence: '2025-01', memo: 'Pagamento energia elétrica', lines: [
      { id: 'jl_011', account_id: 'acc_512', account_code: '5.1.2', account_name: 'Energia Elétrica', debit: 380, credit: 0, document_id: null },
      { id: 'jl_012', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 0, credit: 380, document_id: null },
    ], created_at: '2025-01-15T10:00:00Z' },
    { id: 'je_007', client_id: clientId, date: '2025-01-17', competence: '2025-01', memo: 'Recebimento NF 002', lines: [
      { id: 'jl_013', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 8500, credit: 0, document_id: null },
      { id: 'jl_014', account_id: 'acc_113', account_code: '1.1.3', account_name: 'Clientes a Receber', debit: 0, credit: 8500, document_id: null },
    ], created_at: '2025-01-17T10:00:00Z' },
    { id: 'je_008', client_id: clientId, date: '2025-01-20', competence: '2025-01', memo: 'Pagamento DAS Janeiro', lines: [
      { id: 'jl_015', account_id: 'acc_53', account_code: '5.3', account_name: 'Impostos e Taxas', debit: 1234.56, credit: 0, document_id: 'doc_005' },
      { id: 'jl_016', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 0, credit: 1234.56, document_id: 'doc_005' },
    ], created_at: '2025-01-20T10:00:00Z' },
    { id: 'je_009', client_id: clientId, date: '2025-01-20', competence: '2025-01', memo: 'Pagamento internet', lines: [
      { id: 'jl_017', account_id: 'acc_513', account_code: '5.1.3', account_name: 'Internet e Telefone', debit: 199.90, credit: 0, document_id: null },
      { id: 'jl_018', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 0, credit: 199.90, document_id: null },
    ], created_at: '2025-01-20T10:00:00Z' },
    { id: 'je_010', client_id: clientId, date: '2025-01-25', competence: '2025-01', memo: 'Folha de pagamento janeiro', lines: [
      { id: 'jl_019', account_id: 'acc_521', account_code: '5.2.1', account_name: 'Salários e Ordenados', debit: 6500, credit: 0, document_id: null },
      { id: 'jl_020', account_id: 'acc_213', account_code: '2.1.3', account_name: 'Salários a Pagar', debit: 0, credit: 6500, document_id: null },
    ], created_at: '2025-01-25T10:00:00Z' },
    { id: 'je_011', client_id: clientId, date: '2025-01-30', competence: '2025-01', memo: 'Pagamento salários janeiro', lines: [
      { id: 'jl_021', account_id: 'acc_213', account_code: '2.1.3', account_name: 'Salários a Pagar', debit: 6500, credit: 0, document_id: null },
      { id: 'jl_022', account_id: 'acc_112', account_code: '1.1.2', account_name: 'Bancos c/ Movimento', debit: 0, credit: 6500, document_id: null },
    ], created_at: '2025-01-30T10:00:00Z' },
    { id: 'je_012', client_id: clientId, date: '2025-02-03', competence: '2025-02', memo: 'Receita NF 003 - Suporte Mensal', lines: [
      { id: 'jl_023', account_id: 'acc_113', account_code: '1.1.3', account_name: 'Clientes a Receber', debit: 12000, credit: 0, document_id: 'doc_007' },
      { id: 'jl_024', account_id: 'acc_41', account_code: '4.1', account_name: 'Receita de Serviços', debit: 0, credit: 12000, document_id: 'doc_007' },
    ], created_at: '2025-02-03T10:00:00Z' },
  ];
  setStore('entries', entries);

  // Demo bank transactions
  const transactions: BankTransaction[] = [
    { id: 'bt_001', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-07', description: 'TED RECEBIDA - CONSULTORIA', amount: 15000, matched: true, match_entry_id: 'je_002', match_confidence: 95, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
    { id: 'bt_002', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-08', description: 'PAG BOLETO - ALUGUEL', amount: -2800, matched: true, match_entry_id: 'je_003', match_confidence: 90, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
    { id: 'bt_003', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-10', description: 'PAG FORNECEDOR - EQUIPAMENTOS', amount: -3500, matched: true, match_entry_id: 'je_004', match_confidence: 88, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
    { id: 'bt_004', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-15', description: 'DEB AUTOMATICO - ENERGIA', amount: -380, matched: true, match_entry_id: 'je_006', match_confidence: 85, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
    { id: 'bt_005', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-17', description: 'TED RECEBIDA - DESENVOLVIMENTO', amount: 8500, matched: true, match_entry_id: 'je_007', match_confidence: 92, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
    { id: 'bt_006', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-20', description: 'PAG IMPOSTO - DAS SIMPLES', amount: -1234.56, matched: true, match_entry_id: 'je_008', match_confidence: 98, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
    { id: 'bt_007', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-22', description: 'TARIFA BANCARIA', amount: -45, matched: false, match_entry_id: null, match_confidence: 0, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
    { id: 'bt_008', client_id: clientId, bank_account_id: bankAccId, date: '2025-01-28', description: 'RENDIMENTO POUPANCA', amount: 12.50, matched: false, match_entry_id: null, match_confidence: 0, imported_from: 'extrato_bb_jan.csv', created_at: '2025-01-31T10:00:00Z' },
  ];
  setStore('transactions', transactions);

  // Demo tax periods
  const taxPeriods: TaxPeriod[] = [
    { id: 'tp_001', client_id: clientId, competence: '2025-01', status: 'pago', items: [
      { id: 'ti_001', type: 'DAS', value: 1234.56, due_date: '2025-02-20', paid: true, guide_doc_id: 'doc_005' },
    ]},
    { id: 'tp_002', client_id: clientId, competence: '2025-02', status: 'a_apurar', items: [] },
  ];
  setStore('taxPeriods', taxPeriods);

  // Demo obligations
  const obligations: Obligation[] = [
    { id: 'ob_001', client_id: clientId, name: 'PGDAS-D', regime: 'Simples', competence: '2025-01', due_date: '2025-02-20', status: 'enviada', notes: 'Transmitida em 15/02' },
    { id: 'ob_002', client_id: clientId, name: 'PGDAS-D', regime: 'Simples', competence: '2025-02', due_date: '2025-03-20', status: 'pendente', notes: '' },
    { id: 'ob_003', client_id: clientId, name: 'DEFIS', regime: 'Simples', competence: '2024-12', due_date: '2025-03-31', status: 'pendente', notes: 'Declaração anual' },
  ];
  setStore('obligations', obligations);

  // Demo AI alerts
  const aiAlerts: AIAlert[] = [
    { id: 'ai_001', type: 'valor_atipico', severity: 'warning', title: 'Valor atípico detectado', description: 'O pagamento de energia em janeiro (R$ 380,00) está 40% acima da média dos últimos meses simulados.', source_ids: ['je_006'], confidence: 72, dismissed: false, created_at: '2025-02-01T10:00:00Z' },
    { id: 'ai_002', type: 'guia_faltando', severity: 'error', title: 'Guia DAS fevereiro não encontrada', description: 'Não foi localizado o documento da guia DAS para competência 02/2025. Vencimento em 20/03/2025.', source_ids: ['tp_002'], confidence: 95, dismissed: false, created_at: '2025-02-05T10:00:00Z' },
    { id: 'ai_003', type: 'classificacao', severity: 'info', title: 'Sugestão de classificação', description: 'O documento "Material de Escritório" (doc_008) pode ser classificado na conta 5.1.4 - Material de Escritório.', source_ids: ['doc_008'], confidence: 88, dismissed: false, created_at: '2025-02-06T10:00:00Z' },
    { id: 'ai_004', type: 'duplicidade', severity: 'warning', title: 'Possível lançamento duplicado', description: 'Transação bancária "TARIFA BANCARIA" (R$ 45,00) em 22/01 não possui lançamento contábil correspondente.', source_ids: ['bt_007'], confidence: 60, dismissed: false, created_at: '2025-02-01T10:00:00Z' },
  ];
  setStore('aiAlerts', aiAlerts);

  // Audit logs
  const auditLogs: AuditLog[] = [
    { id: 'al_001', at: '2025-01-15T10:00:00Z', entity: 'client', entity_id: clientId, action: 'create', before_json: null, after_json: JSON.stringify(client), hash: 'seed_hash_001' },
    { id: 'al_002', at: '2025-01-05T10:05:00Z', entity: 'journal_entry', entity_id: 'je_001', action: 'create', before_json: null, after_json: JSON.stringify(entries[0]), hash: 'seed_hash_002' },
  ];
  setStore('auditLogs', auditLogs);
}

// Currency formatting
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatCompetence(comp: string): string {
  const [year, month] = comp.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year}`;
}

const REGIME_LABELS: Record<string, string> = {
  MEI: 'MEI',
  Simples: 'Simples Nacional',
  Presumido: 'Lucro Presumido',
  Real: 'Lucro Real',
};

export function formatRegime(regime: string): string {
  return REGIME_LABELS[regime] || regime;
}
