import { BarChart3, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';

const reports = [
  { name: 'DRE - Demonstração do Resultado', desc: 'Receitas e despesas do período' },
  { name: 'Balanço Patrimonial', desc: 'Ativo, passivo e patrimônio líquido' },
  { name: 'Balancete de Verificação', desc: 'Saldos de todas as contas' },
  { name: 'Livro Diário', desc: 'Todos os lançamentos em ordem cronológica' },
  { name: 'Livro Razão', desc: 'Movimentação por conta contábil' },
  { name: 'Fluxo de Caixa', desc: 'Entradas e saídas de caixa' },
  { name: 'Conciliação Bancária', desc: 'Comparativo banco x contabilidade' },
  { name: 'Dossiê do Mês', desc: 'ZIP com relatórios + documentos principais' },
  { name: 'Relatório Executivo', desc: 'Resumo visual do mês para o cliente' },
  { name: 'Relatório Técnico', desc: 'Detalhamento completo para arquivo' },
];

export default function RelatoriosPage() {
  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Relatórios e Exportações" description="Gerar relatórios em PDF e Excel" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map(report => (
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
    </div>
  );
}
