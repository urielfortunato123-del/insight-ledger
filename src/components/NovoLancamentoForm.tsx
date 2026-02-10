import { useState } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { db, formatCurrency, type JournalEntry, type JournalLine } from '@/lib/data-store';
import { toast } from 'sonner';

interface FormLine {
  id: string;
  account_code: string;
  debit: string;
  credit: string;
  document_id: string;
}

interface NovoLancamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function emptyLine(): FormLine {
  return { id: crypto.randomUUID(), account_code: '', debit: '', credit: '', document_id: '' };
}

export function NovoLancamentoForm({ open, onOpenChange, onSaved }: NovoLancamentoFormProps) {
  const accounts = db.chartAccounts.getAll().filter(a => a.level >= 2);
  const documents = db.documents.getAll();
  const clients = db.clients.getAll();

  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [competence, setCompetence] = useState(new Date().toISOString().slice(0, 7));
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<FormLine[]>([emptyLine(), emptyLine()]);

  const updateLine = (id: string, field: keyof FormLine, value: string) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setCompetence(new Date().toISOString().slice(0, 7));
    setMemo('');
    setLines([emptyLine(), emptyLine()]);
  };

  const handleSave = () => {
    if (!clientId) { toast.error('Selecione um cliente.'); return; }
    if (!memo.trim()) { toast.error('Informe o histórico.'); return; }
    if (!competence) { toast.error('Competência obrigatória.'); return; }

    const filledLines = lines.filter(l => l.account_code);
    if (filledLines.length < 2) { toast.error('Mínimo de 2 linhas com conta selecionada.'); return; }
    if (!isBalanced) { toast.error('Débito deve ser igual ao Crédito.'); return; }

    const journalLines: JournalLine[] = filledLines.map(l => {
      const acc = accounts.find(a => a.code === l.account_code);
      return {
        id: crypto.randomUUID(),
        account_id: acc?.id || '',
        account_code: l.account_code,
        account_name: acc?.name || '',
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        document_id: l.document_id || null,
      };
    });

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      client_id: clientId,
      date,
      competence,
      memo: memo.trim(),
      lines: journalLines,
      created_at: new Date().toISOString(),
    };

    db.entries.save(entry);

    db.auditLogs.add({
      entity: 'journal_entry',
      entity_id: entry.id,
      action: 'create',
      before_json: null,
      after_json: JSON.stringify(entry),
    });

    toast.success('Lançamento criado com sucesso!');
    resetForm();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Novo Lançamento Contábil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Competência</Label>
              <Input type="month" value={competence} onChange={e => setCompetence(e.target.value)} className="h-9" />
            </div>
            <div className="col-span-2 md:col-span-1 space-y-1.5">
              <Label className="text-xs">Histórico</Label>
              <Textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="Descrição do lançamento..."
                className="h-9 min-h-9 resize-none py-2"
                maxLength={200}
              />
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partidas</Label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3 h-3 mr-1" /> Linha
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase w-[40%]">Conta</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase w-[18%]">Débito</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase w-[18%]">Crédito</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground uppercase w-[18%]">Documento</th>
                    <th className="w-[6%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="border-b border-border/50">
                      <td className="p-1.5">
                        <Select value={line.account_code} onValueChange={v => updateLine(line.id, 'account_code', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                          <SelectContent>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.code}>
                                <span className="font-mono text-xs mr-1.5">{a.code}</span>{a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={line.debit}
                          onChange={e => {
                            updateLine(line.id, 'debit', e.target.value);
                            if (e.target.value && parseFloat(e.target.value) > 0) updateLine(line.id, 'credit', '');
                          }}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={line.credit}
                          onChange={e => {
                            updateLine(line.id, 'credit', e.target.value);
                            if (e.target.value && parseFloat(e.target.value) > 0) updateLine(line.id, 'debit', '');
                          }}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-1.5">
                        <Select value={line.document_id} onValueChange={v => updateLine(line.id, 'document_id', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="(nenhum)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">(nenhum)</SelectItem>
                            {documents.map(d => (
                              <SelectItem key={d.id} value={d.id}>
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{d.description}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-1.5 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={lines.length <= 2}
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between px-2 py-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">
                Débito: <strong className="font-mono text-foreground">{formatCurrency(totalDebit)}</strong>
              </span>
              <span className="text-muted-foreground">
                Crédito: <strong className="font-mono text-foreground">{formatCurrency(totalCredit)}</strong>
              </span>
            </div>
            <span className={`text-sm font-semibold ${isBalanced ? 'text-success' : totalDebit === 0 && totalCredit === 0 ? 'text-muted-foreground' : 'text-danger'}`}>
              {isBalanced ? '✓ Balanceado' : totalDebit === 0 && totalCredit === 0 ? 'Informe valores' : '✗ Desbalanceado'}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isBalanced}>Salvar Lançamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
