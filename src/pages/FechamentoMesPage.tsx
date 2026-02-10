import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock, CheckCircle2, Circle, AlertTriangle, FileText,
  BookOpen, Calculator, ClipboardList, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { db, formatCurrency, formatCompetence } from '@/lib/data-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CheckItem {
  id: string;
  category: 'documents' | 'entries' | 'taxes' | 'obligations';
  label: string;
  detail: string;
  ok: boolean;
  severity: 'error' | 'warning' | 'info';
  link: string;
}

export default function FechamentoMesPage() {
  const [competence, setCompetence] = useState('2025-01');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closedMonths, setClosedMonths] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('contabia_closedMonths') || '[]');
    } catch { return []; }
  });

  const clients = db.clients.getAll();
  const documents = db.documents.getAll();
  const entries = db.entries.getAll();
  const taxPeriods = db.taxPeriods.getAll();
  const obligations = db.obligations.getAll();

  const isClosed = closedMonths.includes(competence);

  const checklist = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [];

    // --- DOCUMENTS ---
    const periodDocs = documents.filter(d => d.competence === competence);
    const pendingOcr = periodDocs.filter(d => d.ocr_status === 'pending' || d.ocr_status === 'processing');
    const errorOcr = periodDocs.filter(d => d.ocr_status === 'error');

    items.push({
      id: 'doc_count',
      category: 'documents',
      label: `${periodDocs.length} documento(s) na competência`,
      detail: periodDocs.length === 0 ? 'Nenhum documento cadastrado para este mês' : `${periodDocs.length} documento(s) encontrado(s)`,
      ok: periodDocs.length > 0,
      severity: periodDocs.length === 0 ? 'warning' : 'info',
      link: '/documentos',
    });

    if (pendingOcr.length > 0) {
      items.push({
        id: 'doc_ocr_pending',
        category: 'documents',
        label: `${pendingOcr.length} documento(s) com OCR pendente`,
        detail: 'Documentos aguardando processamento OCR',
        ok: false,
        severity: 'warning',
        link: '/documentos',
      });
    }

    if (errorOcr.length > 0) {
      items.push({
        id: 'doc_ocr_error',
        category: 'documents',
        label: `${errorOcr.length} documento(s) com erro no OCR`,
        detail: 'Documentos com falha no processamento',
        ok: false,
        severity: 'error',
        link: '/documentos',
      });
    }

    // Check each client has at least one NF
    clients.forEach(c => {
      const clientDocs = periodDocs.filter(d => d.client_id === c.id);
      const hasNf = clientDocs.some(d => d.type === 'nf_entrada' || d.type === 'nf_saida');
      if (!hasNf) {
        items.push({
          id: `doc_nf_${c.id}`,
          category: 'documents',
          label: `${c.name}: sem NF no período`,
          detail: 'Nenhuma nota fiscal de entrada ou saída encontrada',
          ok: false,
          severity: 'warning',
          link: '/documentos',
        });
      }
    });

    // --- ENTRIES (Lançamentos) ---
    const periodEntries = entries.filter(e => e.competence === competence);

    items.push({
      id: 'entry_count',
      category: 'entries',
      label: `${periodEntries.length} lançamento(s) na competência`,
      detail: periodEntries.length === 0 ? 'Nenhum lançamento contábil registrado' : `${periodEntries.length} lançamento(s)`,
      ok: periodEntries.length > 0,
      severity: periodEntries.length === 0 ? 'error' : 'info',
      link: '/lancamentos',
    });

    // Check D=C balance
    const totalD = periodEntries.flatMap(e => e.lines).reduce((s, l) => s + l.debit, 0);
    const totalC = periodEntries.flatMap(e => e.lines).reduce((s, l) => s + l.credit, 0);
    const balanced = Math.abs(totalD - totalC) < 0.01;

    items.push({
      id: 'entry_balance',
      category: 'entries',
      label: balanced ? 'Débitos e créditos balanceados' : 'Desbalanceamento entre débitos e créditos',
      detail: `Débitos: ${formatCurrency(totalD)} | Créditos: ${formatCurrency(totalC)}`,
      ok: balanced,
      severity: balanced ? 'info' : 'error',
      link: '/lancamentos',
    });

    // Check entries without document reference
    const entriesNoDoc = periodEntries.filter(e => e.lines.every(l => !l.document_id));
    if (entriesNoDoc.length > 0) {
      items.push({
        id: 'entry_no_doc',
        category: 'entries',
        label: `${entriesNoDoc.length} lançamento(s) sem documento vinculado`,
        detail: 'Lançamentos devem ter suporte documental',
        ok: false,
        severity: 'warning',
        link: '/lancamentos',
      });
    }

    // --- TAXES ---
    const periodTax = taxPeriods.filter(t => t.competence === competence);

    if (periodTax.length === 0) {
      items.push({
        id: 'tax_not_computed',
        category: 'taxes',
        label: 'Impostos não apurados nesta competência',
        detail: 'Execute a apuração fiscal antes de fechar o mês',
        ok: false,
        severity: 'error',
        link: '/fiscal',
      });
    } else {
      periodTax.forEach(tp => {
        const unpaidItems = tp.items.filter(i => !i.paid);
        const noGuide = tp.items.filter(i => !i.guide_doc_id);

        items.push({
          id: `tax_status_${tp.id}`,
          category: 'taxes',
          label: tp.status === 'pago' ? `Impostos ${formatCompetence(tp.competence)}: todos pagos` : `${unpaidItems.length} imposto(s) pendente(s) de pagamento`,
          detail: `Total: ${formatCurrency(tp.items.reduce((s, i) => s + i.value, 0))}`,
          ok: unpaidItems.length === 0,
          severity: unpaidItems.length > 0 ? 'error' : 'info',
          link: '/fiscal',
        });

        if (noGuide.length > 0) {
          items.push({
            id: `tax_guide_${tp.id}`,
            category: 'taxes',
            label: `${noGuide.length} guia(s) sem comprovante vinculado`,
            detail: 'Vincule os comprovantes de pagamento às guias',
            ok: false,
            severity: 'warning',
            link: '/fiscal',
          });
        }
      });
    }

    // --- OBLIGATIONS ---
    const periodOb = obligations.filter(o => o.competence === competence);

    if (periodOb.length === 0) {
      items.push({
        id: 'ob_none',
        category: 'obligations',
        label: 'Nenhuma obrigação acessória na competência',
        detail: 'Verifique se há obrigações aplicáveis ao regime',
        ok: false,
        severity: 'warning',
        link: '/obrigacoes',
      });
    } else {
      const pending = periodOb.filter(o => o.status === 'pendente');
      const late = periodOb.filter(o => o.status === 'atrasada');
      const sent = periodOb.filter(o => o.status === 'enviada');

      if (sent.length === periodOb.length) {
        items.push({
          id: 'ob_all_sent',
          category: 'obligations',
          label: `Todas as ${sent.length} obrigação(ões) enviadas`,
          detail: 'Obrigações acessórias em dia',
          ok: true,
          severity: 'info',
          link: '/obrigacoes',
        });
      }

      if (pending.length > 0) {
        items.push({
          id: 'ob_pending',
          category: 'obligations',
          label: `${pending.length} obrigação(ões) pendente(s)`,
          detail: pending.map(o => o.name).join(', '),
          ok: false,
          severity: 'warning',
          link: '/obrigacoes',
        });
      }

      if (late.length > 0) {
        items.push({
          id: 'ob_late',
          category: 'obligations',
          label: `${late.length} obrigação(ões) atrasada(s)`,
          detail: late.map(o => o.name).join(', '),
          ok: false,
          severity: 'error',
          link: '/obrigacoes',
        });
      }
    }

    return items;
  }, [competence, clients, documents, entries, taxPeriods, obligations]);

  const okCount = checklist.filter(i => i.ok).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? Math.round((okCount / totalCount) * 100) : 0;
  const errors = checklist.filter(i => !i.ok && i.severity === 'error');
  const warnings = checklist.filter(i => !i.ok && i.severity === 'warning');
  const canClose = errors.length === 0;

  const categories = [
    { key: 'documents' as const, label: 'Documentos', icon: FileText, color: 'text-primary' },
    { key: 'entries' as const, label: 'Lançamentos', icon: BookOpen, color: 'text-info' },
    { key: 'taxes' as const, label: 'Impostos', icon: Calculator, color: 'text-warning' },
    { key: 'obligations' as const, label: 'Obrigações', icon: ClipboardList, color: 'text-success' },
  ];

  const handleClose = () => {
    const updated = [...closedMonths, competence];
    setClosedMonths(updated);
    localStorage.setItem('contabia_closedMonths', JSON.stringify(updated));
    db.auditLogs.add({
      entity: 'month_close',
      entity_id: competence,
      action: 'create',
      before_json: null,
      after_json: JSON.stringify({ competence, closedAt: new Date().toISOString(), warnings: warnings.length }),
    });
    toast.success(`Competência ${formatCompetence(competence)} fechada com sucesso!`);
    setConfirmOpen(false);
  };

  const handleReopen = () => {
    const updated = closedMonths.filter(m => m !== competence);
    setClosedMonths(updated);
    localStorage.setItem('contabia_closedMonths', JSON.stringify(updated));
    db.auditLogs.add({
      entity: 'month_close',
      entity_id: competence,
      action: 'delete',
      before_json: JSON.stringify({ competence }),
      after_json: JSON.stringify({ reopenedAt: new Date().toISOString() }),
    });
    toast.info(`Competência ${formatCompetence(competence)} reaberta.`);
  };

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Fechamento de Mês"
        description="Checklist automático de pendências por competência"
        actions={
          isClosed ? (
            <Button variant="outline" size="sm" onClick={handleReopen}>
              <Lock className="w-4 h-4 mr-1" /> Reabrir Mês
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={!canClose}
              title={!canClose ? 'Resolva os erros críticos antes de fechar' : undefined}
            >
              <Lock className="w-4 h-4 mr-1" /> Fechar Mês
            </Button>
          )
        }
      />

      {/* Competence selector + Progress */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Select value={competence} onValueChange={setCompetence}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-01">Janeiro/2025</SelectItem>
            <SelectItem value="2025-02">Fevereiro/2025</SelectItem>
            <SelectItem value="2025-03">Março/2025</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground font-medium">
              {okCount}/{totalCount} itens concluídos
            </span>
            <span className={cn(
              "text-xs font-bold",
              progress === 100 ? "text-success" : progress >= 60 ? "text-warning" : "text-danger"
            )}>
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {isClosed && (
          <StatusBadge status="success" label="Mês Fechado" />
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card className="contab-card border-success/30 bg-success/5">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="text-lg font-bold text-foreground">{okCount}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="contab-card border-warning/30 bg-warning/5">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <p className="text-lg font-bold text-foreground">{warnings.length}</p>
              <p className="text-xs text-muted-foreground">Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("contab-card", errors.length > 0 ? "border-danger/30 bg-danger/5" : "border-border")}>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className={cn("w-5 h-5", errors.length > 0 ? "text-danger" : "text-muted-foreground")} />
            <div>
              <p className="text-lg font-bold text-foreground">{errors.length}</p>
              <p className="text-xs text-muted-foreground">Bloqueantes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist by category */}
      <div className="space-y-4">
        {categories.map(cat => {
          const catItems = checklist.filter(i => i.category === cat.key);
          if (catItems.length === 0) return null;
          const catOk = catItems.filter(i => i.ok).length;

          return (
            <Card key={cat.key} className="contab-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <cat.icon className={cn("w-4 h-4", cat.color)} />
                  {cat.label}
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {catOk}/{catItems.length}
                  </span>
                </CardTitle>
                {catOk === catItems.length && (
                  <StatusBadge status="success" label="OK" />
                )}
              </CardHeader>
              <CardContent className="space-y-1">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-md transition-colors",
                      !item.ok && item.severity === 'error' && "bg-danger/5",
                      !item.ok && item.severity === 'warning' && "bg-warning/5",
                    )}
                  >
                    {item.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <Circle className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        item.severity === 'error' ? "text-danger" : "text-warning"
                      )} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        item.ok ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    {!item.ok && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" asChild>
                        <Link to={item.link}>
                          Resolver <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirm close dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Fechar Competência {formatCompetence(competence)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
              <p className="text-3xl font-bold text-foreground">{progress}%</p>
              <p className="text-sm text-muted-foreground mt-1">{okCount} de {totalCount} itens concluídos</p>
            </div>

            {warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  {warnings.length} aviso(s) não resolvido(s)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O mês pode ser fechado com avisos, mas recomendamos resolvê-los.
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Ao fechar o mês, os lançamentos desta competência serão marcados como finalizados.
              Esta ação é registrada na trilha de auditoria e pode ser revertida.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleClose}>
              <Lock className="w-4 h-4 mr-1" /> Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
