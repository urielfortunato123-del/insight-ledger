import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Calendar, CheckCircle2,
  FileText, FileUp, Plus, BarChart3, Lock, TrendingUp,
  TrendingDown, Bot, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db, loadSeedData, formatCurrency, formatCompetence } from '@/lib/data-store';

export default function Dashboard() {
  useEffect(() => { loadSeedData(); }, []);

  const clients = db.clients.getAll();
  const documents = db.documents.getAll();
  const entries = db.entries.getAll();
  const transactions = db.transactions.getAll();
  const taxPeriods = db.taxPeriods.getAll();
  const obligations = db.obligations.getAll();
  const aiAlerts = db.aiAlerts.getAll().filter(a => !a.dismissed);

  const unmatchedTx = transactions.filter(t => !t.matched);
  const pendingDocs = documents.filter(d => d.ocr_status === 'pending');
  const pendingObligations = obligations.filter(o => o.status === 'pendente');
  const overdueObligations = obligations.filter(o => o.status === 'atrasada');
  const pendingTax = taxPeriods.filter(t => t.status === 'a_apurar');

  // Revenue calculation for current period
  const totalReceitas = entries
    .filter(e => e.competence === '2025-01')
    .flatMap(e => e.lines)
    .filter(l => l.account_code.startsWith('4'))
    .reduce((sum, l) => sum + l.credit, 0);

  const totalDespesas = entries
    .filter(e => e.competence === '2025-01')
    .flatMap(e => e.lines)
    .filter(l => l.account_code.startsWith('5'))
    .reduce((sum, l) => sum + l.debit, 0);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Visão geral — ContabIA Local"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/ia"><Bot className="w-4 h-4 mr-1" /> IA Copiloto</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/clientes"><Plus className="w-4 h-4 mr-1" /> Novo Cliente</Link>
            </Button>
          </div>
        }
      />

      {/* Alerts strip */}
      {aiAlerts.length > 0 && (
        <div className="mb-6 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{aiAlerts.length} alertas da IA requerem atenção</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {aiAlerts.filter(a => a.severity === 'error').length} críticos, {aiAlerts.filter(a => a.severity === 'warning').length} avisos
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/ia">Ver Alertas</Link>
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="contab-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receitas Jan/25</CardTitle>
            <TrendingUp className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totalReceitas)}</div>
            <p className="text-xs text-muted-foreground mt-1">3 notas fiscais emitidas</p>
          </CardContent>
        </Card>

        <Card className="contab-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Despesas Jan/25</CardTitle>
            <TrendingDown className="w-4 h-4 text-danger" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totalDespesas)}</div>
            <p className="text-xs text-muted-foreground mt-1">6 lançamentos de despesa</p>
          </CardContent>
        </Card>

        <Card className="contab-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendências</CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold font-mono text-foreground">{pendingObligations.length + pendingDocs.length + unmatchedTx.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingDocs.length} docs OCR, {unmatchedTx.length} tx sem match
            </p>
          </CardContent>
        </Card>

        <Card className="contab-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes Ativos</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold font-mono text-foreground">{clients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{documents.length} documentos no sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="contab-card lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Atalhos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Importar Extrato', icon: ArrowUpRight, path: '/conciliacao', color: 'text-primary' },
              { label: 'Upload Documentos', icon: FileUp, path: '/documentos', color: 'text-primary' },
              { label: 'Novo Lançamento', icon: Plus, path: '/lancamentos', color: 'text-primary' },
              { label: 'Gerar Relatórios', icon: BarChart3, path: '/relatorios', color: 'text-primary' },
              { label: 'Fechar Mês', icon: Lock, path: '/config', color: 'text-warning' },
            ].map((action) => (
              <Link
                key={action.path + action.label}
                to={action.path}
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors group"
              >
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">{action.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Impostos a vencer */}
        <Card className="contab-card lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Impostos & Obrigações</CardTitle>
            <Link to="/fiscal" className="text-xs text-primary hover:underline">Ver tudo</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {taxPeriods.map((tp) => (
              <div key={tp.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatCompetence(tp.competence)}</p>
                  <p className="text-xs text-muted-foreground">
                    {tp.items.length > 0 ? `${tp.items.length} item(s)` : 'Sem itens'}
                  </p>
                </div>
                <StatusBadge
                  status={tp.status === 'pago' ? 'success' : tp.status === 'atrasado' ? 'danger' : tp.status === 'apurado' ? 'info' : 'warning'}
                  label={tp.status === 'a_apurar' ? 'A apurar' : tp.status === 'pago' ? 'Pago' : tp.status === 'atrasado' ? 'Atrasado' : 'Apurado'}
                />
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Obrigações Pendentes</p>
              {pendingObligations.map((ob) => (
                <div key={ob.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-foreground">{ob.name}</span>
                  <span className="text-xs text-muted-foreground">{ob.due_date.split('-').reverse().join('/')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* IA alerts */}
        <Card className="contab-card lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand" /> Alertas IA
            </CardTitle>
            <Link to="/ia" className="text-xs text-primary hover:underline">Painel IA</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="flex items-start gap-2 py-1.5">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  alert.severity === 'error' ? 'bg-danger' :
                  alert.severity === 'warning' ? 'bg-warning' : 'bg-primary'
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Confiança: {alert.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent entries */}
      <Card className="contab-card mt-6">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Últimos Lançamentos</CardTitle>
          <Link to="/lancamentos" className="text-xs text-primary hover:underline">Ver todos</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Comp.</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Histórico</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Débito</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Crédito</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(-5).reverse().map((entry) => {
                  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
                  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
                  return (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-mono text-xs">{entry.date.split('-').reverse().join('/')}</td>
                      <td className="py-2.5 text-xs">{formatCompetence(entry.competence)}</td>
                      <td className="py-2.5 text-foreground">{entry.memo}</td>
                      <td className="py-2.5 text-right font-mono">{formatCurrency(totalDebit)}</td>
                      <td className="py-2.5 text-right font-mono">{formatCurrency(totalCredit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
