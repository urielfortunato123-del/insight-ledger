import { useState, useRef, useCallback } from 'react';
import { Upload, ArrowRight, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { db, formatCurrency, type BankTransaction } from '@/lib/data-store';
import { toast } from 'sonner';

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type Step = 'upload' | 'map' | 'preview' | 'done';

interface ParsedRow {
  [key: string]: string;
}

const REQUIRED_FIELDS = ['date', 'description', 'amount'] as const;
type MappedField = typeof REQUIRED_FIELDS[number];

const FIELD_LABELS: Record<MappedField, string> = {
  date: 'Data',
  description: 'Descrição',
  amount: 'Valor',
};

function parseCSV(text: string, separator: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });

  return { headers, rows };
}

function parseDate(val: string): string | null {
  // Try DD/MM/YYYY
  const brMatch = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  // Try YYYY-MM-DD
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return null;
}

function parseAmount(val: string): number | null {
  // Handle BR format: 1.234,56 or -1.234,56
  let cleaned = val.replace(/\s/g, '');
  if (cleaned.includes(',') && (cleaned.indexOf(',') > cleaned.lastIndexOf('.'))) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function autoMatch(transactions: { date: string; description: string; amount: number }[]): Map<number, { entryId: string; confidence: number }> {
  const entries = db.entries.getAll();
  const matches = new Map<number, { entryId: string; confidence: number }>();

  transactions.forEach((tx, idx) => {
    let bestMatch: { entryId: string; confidence: number } | null = null;

    for (const entry of entries) {
      const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
      const entryAmount = totalDebit;
      let confidence = 0;

      // Amount match (most important)
      const amountDiff = Math.abs(Math.abs(tx.amount) - entryAmount);
      if (amountDiff < 0.01) confidence += 50;
      else if (amountDiff < 1) confidence += 30;
      else continue; // Skip if amount doesn't match at all

      // Date match
      const txDate = new Date(tx.date).getTime();
      const entryDate = new Date(entry.date).getTime();
      const daysDiff = Math.abs(txDate - entryDate) / (1000 * 60 * 60 * 24);
      if (daysDiff === 0) confidence += 30;
      else if (daysDiff <= 1) confidence += 25;
      else if (daysDiff <= 3) confidence += 15;
      else if (daysDiff <= 7) confidence += 5;

      // Description similarity (simple keyword match)
      const txWords = tx.description.toLowerCase().split(/\s+/);
      const memoWords = entry.memo.toLowerCase().split(/\s+/);
      const commonWords = txWords.filter(w => w.length > 3 && memoWords.some(m => m.includes(w) || w.includes(m)));
      confidence += Math.min(commonWords.length * 5, 20);

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { entryId: entry.id, confidence: Math.min(confidence, 99) };
      }
    }

    if (bestMatch && bestMatch.confidence >= 40) {
      matches.set(idx, bestMatch);
    }
  });

  return matches;
}

export function ImportCSVDialog({ open, onOpenChange, onImported }: ImportCSVDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [separator, setSeparator] = useState(';');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<MappedField, string>>({ date: '', description: '', amount: '' });
  const [fileName, setFileName] = useState('');
  const [parsedTx, setParsedTx] = useState<{ date: string; description: string; amount: number }[]>([]);
  const [matchResults, setMatchResults] = useState<Map<number, { entryId: string; confidence: number }>>(new Map());

  const clients = db.clients.getAll();
  const [clientId, setClientId] = useState(clients[0]?.id || '');

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({ date: '', description: '', amount: '' });
    setFileName('');
    setParsedTx([]);
    setMatchResults(new Map());
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text, separator);
      if (h.length === 0) {
        toast.error('CSV vazio ou formato inválido.');
        return;
      }
      setHeaders(h);
      setRows(r);

      // Auto-detect columns
      const autoMap: Record<MappedField, string> = { date: '', description: '', amount: '' };
      for (const col of h) {
        const lower = col.toLowerCase();
        if (!autoMap.date && (lower.includes('data') || lower === 'date')) autoMap.date = col;
        if (!autoMap.description && (lower.includes('descri') || lower.includes('histori') || lower === 'memo')) autoMap.description = col;
        if (!autoMap.amount && (lower.includes('valor') || lower.includes('amount') || lower.includes('saldo') || lower.includes('value'))) autoMap.amount = col;
      }
      setMapping(autoMap);
      setStep('map');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleMap = () => {
    if (!mapping.date || !mapping.description || !mapping.amount) {
      toast.error('Mapeie todos os campos obrigatórios.');
      return;
    }

    const txList: { date: string; description: string; amount: number }[] = [];
    let errors = 0;

    for (const row of rows) {
      const date = parseDate(row[mapping.date]);
      const amount = parseAmount(row[mapping.amount]);
      const description = row[mapping.description]?.trim();

      if (!date || amount === null || !description) {
        errors++;
        continue;
      }
      txList.push({ date, description, amount });
    }

    if (txList.length === 0) {
      toast.error('Nenhuma transação válida encontrada no CSV.');
      return;
    }
    if (errors > 0) {
      toast.warning(`${errors} linha(s) ignorada(s) por dados inválidos.`);
    }

    setParsedTx(txList);
    const matches = autoMatch(txList);
    setMatchResults(matches);
    setStep('preview');
  };

  const handleImport = () => {
    const client = clients.find(c => c.id === clientId);
    const bankAccountId = client?.bank_accounts?.[0]?.id || '';

    const newTransactions: BankTransaction[] = parsedTx.map((tx, idx) => {
      const match = matchResults.get(idx);
      return {
        id: crypto.randomUUID(),
        client_id: clientId,
        bank_account_id: bankAccountId,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        matched: !!match && match.confidence >= 60,
        match_entry_id: match && match.confidence >= 60 ? match.entryId : null,
        match_confidence: match?.confidence || 0,
        imported_from: fileName,
        created_at: new Date().toISOString(),
      };
    });

    for (const tx of newTransactions) {
      db.transactions.save(tx);
    }

    db.auditLogs.add({
      entity: 'bank_import',
      entity_id: fileName,
      action: 'create',
      before_json: null,
      after_json: JSON.stringify({ count: newTransactions.length, matched: newTransactions.filter(t => t.matched).length }),
    });

    const matchedCount = newTransactions.filter(t => t.matched).length;
    toast.success(`${newTransactions.length} transações importadas, ${matchedCount} conciliadas automaticamente.`);
    setStep('done');
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Extrato CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          {(['upload', 'map', 'preview', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              <span className={`px-2 py-0.5 rounded-full ${step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {s === 'upload' ? '1. Upload' : s === 'map' ? '2. Mapear' : s === 'preview' ? '3. Preview' : '4. Pronto'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Separador</Label>
                <Select value={separator} onValueChange={setSeparator}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=";">Ponto e vírgula (;)</SelectItem>
                    <SelectItem value=",">Vírgula (,)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-foreground font-medium">Clique para selecionar o arquivo CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Formatos: .csv — Separadores: ; , tab</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </div>
          </div>
        )}

        {/* Step 2: Column mapping */}
        {step === 'map' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
              <span className="font-medium">{fileName}</span> — {rows.length} linha(s), {headers.length} coluna(s) detectada(s)
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mapeamento de Colunas</Label>
              {REQUIRED_FIELDS.map(field => (
                <div key={field} className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-sm text-right">{FIELD_LABELS[field]} <span className="text-danger">*</span></Label>
                  <Select value={mapping[field]} onValueChange={v => setMapping(prev => ({ ...prev, [field]: v }))}>
                    <SelectTrigger className="h-9 col-span-2"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                    <SelectContent>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview first rows */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Prévia das primeiras linhas:</Label>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">{headers.map(h => <th key={h} className="p-2 text-left text-muted-foreground">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        {headers.map(h => <td key={h} className="p-2">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); }}>Voltar</Button>
              <Button onClick={handleMap}>Processar e Match</Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview with match results */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-lg font-bold font-mono text-foreground">{parsedTx.length}</p>
                <p className="text-xs text-muted-foreground">Transações</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                <p className="text-lg font-bold font-mono text-success">
                  {[...matchResults.values()].filter(m => m.confidence >= 60).length}
                </p>
                <p className="text-xs text-muted-foreground">Match automático</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
                <p className="text-lg font-bold font-mono text-warning">
                  {parsedTx.length - [...matchResults.values()].filter(m => m.confidence >= 60).length}
                </p>
                <p className="text-xs text-muted-foreground">Sem match</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-border rounded-lg max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase">Data</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground uppercase">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTx.map((tx, idx) => {
                    const match = matchResults.get(idx);
                    const hasMatch = match && match.confidence >= 60;
                    return (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-2 font-mono text-xs">{tx.date.split('-').reverse().join('/')}</td>
                        <td className="p-2 text-foreground truncate max-w-[200px]">{tx.description}</td>
                        <td className={`p-2 text-right font-mono ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-2 text-center">
                          {hasMatch ? (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {match.confidence}%
                            </span>
                          ) : match ? (
                            <span className="inline-flex items-center gap-1 text-xs text-warning">
                              <AlertTriangle className="w-3.5 h-3.5" /> {match.confidence}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('map')}>Voltar</Button>
              <Button onClick={handleImport}>
                <Upload className="w-4 h-4 mr-1" /> Importar {parsedTx.length} Transações
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
            <div>
              <p className="text-lg font-semibold text-foreground">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">
                As transações foram adicionadas à conciliação bancária.
              </p>
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
