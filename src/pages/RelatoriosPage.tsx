import { useState } from 'react';
import { BarChart3, FileDown, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatCompetence } from '@/lib/data-store';
import {
  generateDRE, generateBalancete,
  buildDREHtml, buildBalanceteHtml,
  printReport,
  type DRELine, type BalanceteLine,
} from '@/lib/report-generator';

const otherReports = [
  { name: 'Balanço Patrimonial', desc: 'Ativo, passivo e patrimônio líquido' },
  { name: 'Livro Diário', desc: 'Todos os lançamentos em ordem cronológica' },
  { name: 'Livro Razão', desc: 'Movimentação por conta contábil' },
  { name: 'Fluxo de Caixa', desc: 'Entradas e saídas de caixa' },
  { name: 'Conciliação Bancária', desc: 'Comparativo banco x contabilidade' },
  { name: 'Dossiê do Mês', desc: 'ZIP com relatórios + documentos principais' },
  { name: 'Relatório Executivo', desc: 'Resumo visual do mês para o cliente' },
  { name: 'Relatório Técnico', desc: 'Detalhamento completo para arquivo' },
];

export default function RelatoriosPage() {
  const [competence, setCompetence] = useState('2025-01');
  const [dreOpen, setDreOpen] = useState(false);
  const [balanceteOpen, setBalanceteOpen] = useState(false);

  const dre = generateDRE(competence);
  const balancete = generateBalancete(competence);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Relatórios e Exportações" description="Gerar relatórios em PDF e Excel" />

      <div className="flex items-center gap-4 mb-6">
        <Select value={competence} onValueChange={setCompetence}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-01">Janeiro/2025</SelectItem>
            <SelectItem value="2025-02">Fevereiro/2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DRE and Balancete - functional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="contab-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              DRE — Demonstração do Resultado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="font-mono font-bold text-success">{formatCurrency(dre.totalReceitas)}</p>
              </div>
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="font-mono font-bold text-danger">{formatCurrency(dre.totalDespesas)}</p>
              </div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${dre.resultado >= 0 ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
              <p className="text-xs text-muted-foreground">Resultado</p>
              <p className={`font-mono text-lg font-bold ${dre.resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(dre.resultado)}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setDreOpen(true)}>
                <FileText className="w-4 h-4 mr-1" /> Visualizar
              </Button>
              <Button size="sm" className="flex-1" onClick={() => printReport('DRE — Demonstração do Resultado', competence, buildDREHtml(competence))}>
                <Printer className="w-4 h-4 mr-1" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="contab-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Balancete de Verificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs text-muted-foreground">Total Saldo Devedor</p>
                <p className="font-mono font-bold text-foreground">{formatCurrency(balancete.totalDebit)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs text-muted-foreground">Total Saldo Credor</p>
                <p className="font-mono font-bold text-foreground">{formatCurrency(balancete.totalCredit)}</p>
              </div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${balancete.totalDebit === balancete.totalCredit ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
              <p className="text-xs text-muted-foreground">{balancete.totalDebit === balancete.totalCredit ? '✓ Balanceado' : '✗ Desbalanceado'}</p>
              <p className="font-mono text-sm text-muted-foreground">{balancete.lines.length} contas com movimentação</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setBalanceteOpen(true)}>
                <FileText className="w-4 h-4 mr-1" /> Visualizar
              </Button>
              <Button size="sm" className="flex-1" onClick={() => printReport('Balancete de Verificação', competence, buildBalanceteHtml(competence))}>
                <Printer className="w-4 h-4 mr-1" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Other reports */}
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Outros Relatórios</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {otherReports.map(report => (
          <Card key={report.name} className="contab-card hover:shadow-md cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{report.name}</p>
                <p className="text-xs text-muted-foreground">{report.desc}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs">PDF</Button>
                <Button variant="ghost" size="sm" className="text-xs">Excel</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DRE Preview Dialog */}
      <Dialog open={dreOpen} onOpenChange={setDreOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>DRE — {formatCompetence(competence)}</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase">Conta</th>
                <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {dre.lines.map((line, i) => (
                <tr key={i} className={`border-b border-border/50 ${line.isTotal ? 'bg-muted/50 font-semibold' : ''}`}>
                  <td className="p-2" style={{ paddingLeft: line.isTotal ? 8 : line.level * 16 }}>
                    {line.code ? `${line.code} — ` : ''}{line.name}
                  </td>
                  <td className={`p-2 text-right font-mono ${line.name === 'RESULTADO DO EXERCÍCIO' ? (line.value >= 0 ? 'text-success' : 'text-danger') : ''}`}>
                    {formatCurrency(line.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => printReport('DRE — Demonstração do Resultado', competence, buildDREHtml(competence))}>
              <Printer className="w-4 h-4 mr-1" /> Exportar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balancete Preview Dialog */}
      <Dialog open={balanceteOpen} onOpenChange={setBalanceteOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Balancete de Verificação — {formatCompetence(competence)}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase">Código</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground uppercase">Conta</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase">Débito</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase">Crédito</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase">Saldo Dev.</th>
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground uppercase">Saldo Cred.</th>
                </tr>
              </thead>
              <tbody>
                {balancete.lines.map((line, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-mono text-xs">{line.code}</td>
                    <td className="p-2">{line.name}</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(line.debitMovement)}</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(line.creditMovement)}</td>
                    <td className="p-2 text-right font-mono">{line.debitBalance > 0 ? formatCurrency(line.debitBalance) : '—'}</td>
                    <td className="p-2 text-right font-mono">{line.creditBalance > 0 ? formatCurrency(line.creditBalance) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                  <td className="p-2" colSpan={4}>TOTAL</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(balancete.totalDebit)}</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(balancete.totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => printReport('Balancete de Verificação', competence, buildBalanceteHtml(competence))}>
              <Printer className="w-4 h-4 mr-1" /> Exportar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
