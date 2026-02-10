import { useState } from 'react';
import { ArrowLeftRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db, formatCurrency, formatDate } from '@/lib/data-store';
import { ImportCSVDialog } from '@/components/ImportCSVDialog';

export default function ConciliacaoPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const transactions = db.transactions.getAll();
  const matched = transactions.filter(t => t.matched);
  const unmatched = transactions.filter(t => !t.matched);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Conciliação Bancária"
        description="Importação de extratos e match automático"
        actions={
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Importar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="contab-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-foreground">{transactions.length}</p>
            <p className="text-xs text-muted-foreground">Total transações</p>
          </CardContent>
        </Card>
        <Card className="contab-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-success">{matched.length}</p>
            <p className="text-xs text-muted-foreground">Conciliadas</p>
          </CardContent>
        </Card>
        <Card className="contab-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-warning">{unmatched.length}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="contab-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Transações Bancárias</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs">{formatDate(tx.date)}</td>
                  <td className="p-3 text-foreground">{tx.description}</td>
                  <td className={`p-3 text-right font-mono ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge status={tx.matched ? 'success' : 'warning'} label={tx.matched ? 'Conciliado' : 'Pendente'} />
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{tx.matched ? `${tx.match_confidence}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ImportCSVDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => setVersion(v => v + 1)} />
    </div>
  );
}
