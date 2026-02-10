import { useState, useCallback } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, formatCurrency, formatDate, formatCompetence } from '@/lib/data-store';
import { NovoLancamentoForm } from '@/components/NovoLancamentoForm';

export default function LancamentosPage() {
  const [competence, setCompetence] = useState('2025-01');
  const [formOpen, setFormOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const entries = db.entries.getAll().filter(e => e.competence === competence);

  const totalDebit = entries.flatMap(e => e.lines).reduce((s, l) => s + l.debit, 0);
  const totalCredit = entries.flatMap(e => e.lines).reduce((s, l) => s + l.credit, 0);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Lançamentos Contábeis"
        description="Livro diário e lançamentos por competência"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1" /> Novo Lançamento</Button>
        }
      />

      <div className="flex items-center gap-4 mb-4">
        <Select value={competence} onValueChange={setCompetence}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-01">Janeiro/2025</SelectItem>
            <SelectItem value="2025-02">Fevereiro/2025</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-4 text-sm">
          <span className="text-muted-foreground">Total Débito: <strong className="text-foreground font-mono">{formatCurrency(totalDebit)}</strong></span>
          <span className="text-muted-foreground">Total Crédito: <strong className="text-foreground font-mono">{formatCurrency(totalCredit)}</strong></span>
          <span className={totalDebit === totalCredit ? 'text-success' : 'text-danger'}>
            {totalDebit === totalCredit ? '✓ Balanceado' : '✗ Desbalanceado'}
          </span>
        </div>
      </div>

      <Card className="contab-card">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Histórico</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Conta</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Débito</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Crédito</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                entry.lines.map((line, idx) => (
                  <tr key={line.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{idx === 0 ? formatDate(entry.date) : ''}</td>
                    <td className="p-3 text-foreground">{idx === 0 ? entry.memo : ''}</td>
                    <td className="p-3 text-muted-foreground">
                      <span className="font-mono text-xs mr-1">{line.account_code}</span>
                      {line.account_name}
                    </td>
                    <td className="p-3 text-right font-mono">{line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
                    <td className="p-3 text-right font-mono">{line.credit > 0 ? formatCurrency(line.credit) : ''}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum lançamento para esta competência</p>
            </div>
          )}
        </CardContent>
      </Card>

      <NovoLancamentoForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => setVersion(v => v + 1)} />
    </div>
  );
}
