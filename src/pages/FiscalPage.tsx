import { useState } from 'react';
import { Calculator, Play, CheckCircle2, Info, TrendingUp, FileText, Paperclip, CreditCard } from 'lucide-react';
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
import { db, formatCurrency, formatCompetence, formatRegime, type TaxPeriod, type TaxItem } from '@/lib/data-store';
import { apurarImpostos, salvarApuracao, type ApuracaoResult } from '@/lib/fiscal-rules';
import { toast } from 'sonner';

export default function FiscalPage() {
  const clients = db.clients.getAll();
  const documents = db.documents.getAll();
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [competence, setCompetence] = useState('2025-01');
  const [apuracaoResult, setApuracaoResult] = useState<ApuracaoResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedTp, setSelectedTp] = useState<TaxPeriod | null>(null);
  const [selectedItem, setSelectedItem] = useState<TaxItem | null>(null);
  const [selectedDocId, setSelectedDocId] = useState('');
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

  const handleMarkPaid = (tp: TaxPeriod, item: TaxItem) => {
    setSelectedTp(tp);
    setSelectedItem(item);
    setPayDialogOpen(true);
  };

  const confirmPay = () => {
    if (!selectedTp || !selectedItem) return;
    const before = JSON.stringify(selectedTp);
    const updated: TaxPeriod = {
      ...selectedTp,
      items: selectedTp.items.map(i =>
        i.id === selectedItem.id ? { ...i, paid: true } : i
      ),
    };
    // If all items paid, mark period as paid
    if (updated.items.every(i => i.paid)) {
      updated.status = 'pago';
    }
    db.taxPeriods.save(updated);
    db.auditLogs.add({
      entity: 'tax_item',
      entity_id: selectedItem.id,
      action: 'update',
      before_json: before,
      after_json: JSON.stringify(updated),
    });
    toast.success(`${selectedItem.type} marcado como pago!`);
    setPayDialogOpen(false);
    setVersion(v => v + 1);
  };

  const handleLinkDoc = (tp: TaxPeriod, item: TaxItem) => {
    setSelectedTp(tp);
    setSelectedItem(item);
    setSelectedDocId(item.guide_doc_id || '');
    setLinkDialogOpen(true);
  };

  const confirmLink = () => {
    if (!selectedTp || !selectedItem) return;
    const before = JSON.stringify(selectedTp);
    const updated: TaxPeriod = {
      ...selectedTp,
      items: selectedTp.items.map(i =>
        i.id === selectedItem.id ? { ...i, guide_doc_id: selectedDocId || null } : i
      ),
    };
    db.taxPeriods.save(updated);
    db.auditLogs.add({
      entity: 'tax_item',
      entity_id: selectedItem.id,
      action: 'update',
      before_json: before,
      after_json: JSON.stringify(updated),
    });
    const docName = documents.find(d => d.id === selectedDocId)?.description;
    toast.success(selectedDocId ? `Comprovante "${docName}" vinculado!` : 'Comprovante removido.');
    setLinkDialogOpen(false);
    setVersion(v => v + 1);
  };

  const getDocName = (docId: string | null) => {
    if (!docId) return null;
    return documents.find(d => d.id === docId)?.description || docId;
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
          <div className="ml-auto">
            <StatusBadge status="info" label={formatRegime(client.regime)} dot={false} />
          </div>
        )}
      </div>

      {/* Regime info */}
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
                        <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Comprovante</th>
                        <th className="text-center py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="text-center py-2 text-xs font-medium text-muted-foreground uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tp.items.map(item => (
                        <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 font-medium text-foreground">{item.type}</td>
                          <td className="py-2 text-right font-mono">{formatCurrency(item.value)}</td>
                          <td className="py-2 text-muted-foreground">{item.due_date.split('-').reverse().join('/')}</td>
                          <td className="py-2">
                            {item.guide_doc_id ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <FileText className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{getDocName(item.guide_doc_id)}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 text-center">
                            <StatusBadge status={item.paid ? 'success' : 'warning'} label={item.paid ? 'Pago' : 'Pendente'} />
                          </td>
                          <td className="py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!item.paid && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-success hover:text-success"
                                  onClick={() => handleMarkPaid(tp, item)}
                                >
                                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Pagar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleLinkDoc(tp, item)}
                              >
                                <Paperclip className="w-3.5 h-3.5 mr-1" /> {item.guide_doc_id ? 'Trocar' : 'Vincular'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Total: <strong className="font-mono text-foreground">{formatCurrency(tp.items.reduce((s, i) => s + i.value, 0))}</strong></span>
                      <span>Pago: <strong className="font-mono text-success">{formatCurrency(tp.items.filter(i => i.paid).reduce((s, i) => s + i.value, 0))}</strong></span>
                      <span>Pendente: <strong className="font-mono text-warning">{formatCurrency(tp.items.filter(i => !i.paid).reduce((s, i) => s + i.value, 0))}</strong></span>
                    </div>
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

      {/* Pay confirmation dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-sm text-muted-foreground">{selectedItem.type}</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">{formatCurrency(selectedItem.value)}</p>
                <p className="text-xs text-muted-foreground mt-1">Vencimento: {selectedItem.due_date.split('-').reverse().join('/')}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Deseja marcar este imposto como <strong className="text-success">pago</strong>? Esta ação será registrada na trilha de auditoria.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmPay} className="bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link document dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary" />
              Vincular Comprovante
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
                <span className="font-medium">{selectedItem.type}</span> — {formatCurrency(selectedItem.value)}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Documento / Guia</label>
                <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o comprovante" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(Remover vínculo)</SelectItem>
                    {documents.filter(d => d.type === 'guia' || d.type === 'boleto' || d.type === 'outro').map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3" />
                          {d.description}
                        </span>
                      </SelectItem>
                    ))}
                    {documents.filter(d => d.type !== 'guia' && d.type !== 'boleto' && d.type !== 'outro').length > 0 && (
                      <>
                        {documents.filter(d => d.type !== 'guia' && d.type !== 'boleto' && d.type !== 'outro').map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              {d.description}
                            </span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmLink}>
              <Paperclip className="w-4 h-4 mr-1" /> Salvar Vínculo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
