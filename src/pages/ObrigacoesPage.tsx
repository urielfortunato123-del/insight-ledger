import { ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db } from '@/lib/data-store';

export default function ObrigacoesPage() {
  const obligations = db.obligations.getAll();

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Obrigações Acessórias" description="Checklist por regime tributário" />

      <Card className="contab-card">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Obrigação</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Regime</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Competência</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Vencimento</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {obligations.map(ob => (
                <tr key={ob.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium text-foreground">{ob.name}</td>
                  <td className="p-3 text-muted-foreground">{ob.regime}</td>
                  <td className="p-3 text-muted-foreground">{ob.competence}</td>
                  <td className="p-3 font-mono text-xs">{ob.due_date.split('-').reverse().join('/')}</td>
                  <td className="p-3 text-center">
                    <StatusBadge
                      status={ob.status === 'enviada' ? 'success' : ob.status === 'atrasada' ? 'danger' : 'warning'}
                      label={ob.status.charAt(0).toUpperCase() + ob.status.slice(1)}
                    />
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{ob.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {obligations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma obrigação cadastrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
