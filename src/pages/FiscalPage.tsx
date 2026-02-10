import { Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db, formatCurrency, formatCompetence } from '@/lib/data-store';

export default function FiscalPage() {
  const taxPeriods = db.taxPeriods.getAll();

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Fiscal / Impostos" description="Apuração por regime e calendário de vencimentos" />

      <div className="space-y-4">
        {taxPeriods.map(tp => (
          <Card key={tp.id} className="contab-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">{formatCompetence(tp.competence)}</CardTitle>
              <StatusBadge
                status={tp.status === 'pago' ? 'success' : tp.status === 'atrasado' ? 'danger' : tp.status === 'apurado' ? 'info' : 'warning'}
                label={tp.status === 'a_apurar' ? 'A Apurar' : tp.status.charAt(0).toUpperCase() + tp.status.slice(1)}
              />
            </CardHeader>
            <CardContent>
              {tp.items.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Tributo</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Vencimento</th>
                      <th className="text-center py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tp.items.map(item => (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-2 font-medium text-foreground">{item.type}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(item.value)}</td>
                        <td className="py-2 text-muted-foreground">{item.due_date.split('-').reverse().join('/')}</td>
                        <td className="py-2 text-center">
                          <StatusBadge status={item.paid ? 'success' : 'warning'} label={item.paid ? 'Pago' : 'Pendente'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Nenhum item apurado ainda.</p>
              )}
            </CardContent>
          </Card>
        ))}

        {taxPeriods.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum período fiscal cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
