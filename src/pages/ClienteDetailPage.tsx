import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, FileText, BookOpen, ArrowLeftRight, Calculator, UserCheck, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { db, formatCurrency, formatDate, formatCompetence, formatRegime } from '@/lib/data-store';

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const client = db.clients.getById(id || '');
  const documents = db.documents.getByClient(id || '');
  const entries = db.entries.getByClient(id || '');
  const transactions = db.transactions.getByClient(id || '');

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" size="sm" asChild className="mt-2">
          <Link to="/clientes"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clientes"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{client.name}</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-mono text-muted-foreground">{client.cnpj_cpf}</span>
                <StatusBadge status="info" label={formatRegime(client.regime)} dot={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs text-muted-foreground">
        {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
        {client.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.address}</span>}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documentos">
        <TabsList className="mb-4">
          <TabsTrigger value="documentos" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Documentos ({documents.length})</TabsTrigger>
          <TabsTrigger value="lancamentos" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Lançamentos ({entries.length})</TabsTrigger>
          <TabsTrigger value="conciliacao" className="gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /> Conciliação ({transactions.length})</TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1.5"><Calculator className="w-3.5 h-3.5" /> Fiscal</TabsTrigger>
          <TabsTrigger value="dp" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" /> DP</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos">
          <Card className="contab-card">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Comp.</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">OCR</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <StatusBadge
                          status={doc.type.includes('saida') ? 'success' : doc.type.includes('entrada') ? 'warning' : 'muted'}
                          label={doc.type.replace(/_/g, ' ').replace('nf ', 'NF ')}
                          dot={false}
                        />
                      </td>
                      <td className="p-3 text-foreground">{doc.description}</td>
                      <td className="p-3 text-muted-foreground">{formatCompetence(doc.competence)}</td>
                      <td className="p-3 text-right font-mono">{doc.value > 0 ? formatCurrency(doc.value) : '—'}</td>
                      <td className="p-3 text-center">
                        <StatusBadge
                          status={doc.ocr_status === 'done' ? 'success' : doc.ocr_status === 'error' ? 'danger' : 'warning'}
                          label={doc.ocr_status === 'done' ? 'OK' : doc.ocr_status === 'pending' ? 'Pendente' : doc.ocr_status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lancamentos">
          <Card className="contab-card">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Comp.</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Histórico</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Débito</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => {
                    const totalD = entry.lines.reduce((s, l) => s + l.debit, 0);
                    const totalC = entry.lines.reduce((s, l) => s + l.credit, 0);
                    return (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs">{formatDate(entry.date)}</td>
                        <td className="p-3 text-xs">{formatCompetence(entry.competence)}</td>
                        <td className="p-3 text-foreground">{entry.memo}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(totalD)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(totalC)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conciliacao">
          <Card className="contab-card">
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
                        <StatusBadge
                          status={tx.matched ? 'success' : 'warning'}
                          label={tx.matched ? 'Conciliado' : 'Pendente'}
                        />
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {tx.matched ? `${tx.match_confidence}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">
          <div className="text-center py-12 text-muted-foreground">
            <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Módulo fiscal disponível na página /fiscal</p>
            <Button variant="outline" size="sm" asChild className="mt-3">
              <Link to="/fiscal">Ir para Fiscal</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="dp">
          <div className="text-center py-12 text-muted-foreground">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Módulo DP disponível na página /dp</p>
            <Button variant="outline" size="sm" asChild className="mt-3">
              <Link to="/dp">Ir para DP</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
