import { useState } from 'react';
import { Calculator, Play, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { db, formatCurrency, formatCompetence, formatRegime } from '@/lib/data-store';
import { apurarImpostos, salvarApuracao, type ApuracaoResult } from '@/lib/fiscal-rules';
import { toast } from 'sonner';

export default function FiscalPage() {
  const clients = db.clients.getAll();
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [competence, setCompetence] = useState('2025-01');
  const [apuracaoResult, setApuracaoResult] = useState<ApuracaoResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const client = db.clients.getById(clientId);
  const taxPeriods = db.taxPeriods.getByClient(clientId);

  const handleApurar = () => {
    const result = apurarImpostos(clientId, competence);
    if (!result) {
      toast.error('Não foi possível apurar. Verifique se há lançamentos no período.');
      return;
    }
    setApuracaoResult(result);
    setDialogOpen(true);
  };

  const handleSalvar = () => {
    if (!apuracaoResult) return;
    salvarApuracao(clientId, apuracaoResult);
    toast.success('Apuração salva com sucesso!');
    setDialogOpen(false);
    setApuracaoResult(null);
    setVersion(v => v + 1);
  };

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Fiscal / Impostos"
        description="Apuração automática por regime tributário"
        actions={
          <Button size="sm" onClick={handleApurar} disabled={!clientId}>
            <Play className="w-4 h-4 mr-1" /> Apurar Impostos
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Selecione cliente" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={competence} onValueChange={setCompetence}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-01">Janeiro/2025</SelectItem>
            <SelectItem value="2025-02">Fevereiro/2025</SelectItem>
          </SelectContent>
        </Select>
        {client && (
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status="info" label={formatRegime(client.regime)} dot={false} />
          </div>
        )}
      </div>

      {/* Regime info card */}
      {client && (
        <Card className="contab-card mb-6 border-primary/20">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-foreground mb-1">Regime: {formatRegime(client.regime)}</p>
              <p className="text-muted-foreground">
                {client.regime === 'MEI' && 'Valor fixo mensal (DAS-MEI). Faturamento até R$ 81.000/ano.'}
                {client.regime === 'Simples' && 'Alíquota progressiva pelo Anexo III (serviços). DAS unificado com vencimento dia 20 do mês seguinte.'}
                {client.regime === 'Presumido' && 'Base de cálculo presumida de 32% (serviços). IRPJ, CSLL, PIS, COFINS e ISS separados.'}
                {client.regime === 'Real' && 'Tributação sobre lucro real apurado (receita - despesas). PIS e COFINS não-cumulativos.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax periods */}
      <div className="space-y-4">
        {taxPeriods.map(tp => (
          <Card key={tp.id} className="contab-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                {formatCompetence(tp.competence)}
              </CardTitle>
              <StatusBadge
                status={tp.status === 'pago' ? 'success' : tp.status === 'atrasado' ? 'danger' : tp.status === 'apurado' ? 'info' : 'warning'}
                label={tp.status === 'a_apurar' ? 'A Apurar' : tp.status.charAt(0).toUpperCase() + tp.status.slice(1)}
              />
            </CardHeader>
            <CardContent>
              {tp.items.length > 0 ? (
                <>
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
                  <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total de impostos:</span>
                    <span className="font-mono font-bold text-foreground">{formatCurrency(tp.items.reduce((s, i) => s + i.value, 0))}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Nenhum item apurado ainda. Clique em "Apurar Impostos" para calcular.</p>
              )}
            </CardContent>
          </Card>
        ))}

        {taxPeriods.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum período fiscal cadastrado</p>
            <p className="text-xs mt-1">Clique em "Apurar Impostos" para gerar a apuração automaticamente</p>
          </div>
        )}
      </div>

      {/* Apuração dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Apuração — {apuracaoResult?.regime}
            </DialogTitle>
          </DialogHeader>

          {apuracaoResult && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Competência: <strong className="text-foreground">{formatCompetence(apuracaoResult.competence)}</strong>
              </div>

              {/* Detalhes do cálculo */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Memória de Cálculo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {apuracaoResult.detalhes.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-mono text-foreground">{d.valor}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Impostos gerados */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Impostos a Recolher</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 text-xs text-muted-foreground">Tributo</th>
                        <th className="text-right py-1.5 text-xs text-muted-foreground">Valor</th>
                        <th className="text-left py-1.5 text-xs text-muted-foreground">Vencimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apuracaoResult.items.map((item, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1.5 font-medium">{item.type}</td>
                          <td className="py-1.5 text-right font-mono">{formatCurrency(item.value)}</td>
                          <td className="py-1.5 text-muted-foreground">{item.due_date.split('-').reverse().join('/')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Summary */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Impostos</p>
                  <p className="text-xl font-bold font-mono text-foreground">{formatCurrency(apuracaoResult.totalImpostos)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Alíquota Efetiva</p>
                  <p className="text-xl font-bold font-mono text-primary">{apuracaoResult.aliquotaEfetiva.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Salvar Apuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
