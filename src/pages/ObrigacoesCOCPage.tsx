import { useState } from 'react';
import { ClipboardList, Calendar, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useCompanyObligations, useUpdateObligationStatus, type CompanyObligation } from '@/hooks/use-obligations';
import { useCompanies } from '@/hooks/use-companies';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', badge: 'warning' as const },
  { value: 'em_andamento', label: 'Em Andamento', badge: 'info' as const },
  { value: 'enviado', label: 'Enviado', badge: 'success' as const },
  { value: 'retificar', label: 'Retificar', badge: 'danger' as const },
];

const KANBAN_COLUMNS = ['pendente', 'em_andamento', 'enviado', 'retificar'] as const;

function KanbanColumn({ status, obligations, onChangeStatus }: {
  status: string;
  obligations: CompanyObligation[];
  onChangeStatus: (id: string, status: string) => void;
}) {
  const cfg = STATUS_OPTIONS.find(s => s.value === status)!;
  const colorMap = { warning: 'border-warning/50', info: 'border-primary/50', success: 'border-success/50', danger: 'border-danger/50' };
  return (
    <div className="flex-1 min-w-[250px]">
      <div className={`border-t-2 ${colorMap[cfg.badge]} rounded-t-md`}>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-t-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">{obligations.length}</span>
        </div>
      </div>
      <div className="space-y-2 p-2 bg-muted/20 rounded-b-md min-h-[200px]">
        {obligations.map(ob => (
          <Card key={ob.id} className="bg-card border border-border/50 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">{ob.obligation_types?.nome || '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{ob.companies?.razao_social}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{ob.competencia}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {new Date(ob.prazo).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {ob.protocolo && <p className="text-[10px] text-success font-mono">✓ {ob.protocolo}</p>}
              <Select value={ob.status} onValueChange={v => onChangeStatus(ob.id, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ObrigacoesCOCPage() {
  const [view, setView] = useState<'kanban' | 'tabela'>('kanban');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterComp, setFilterComp] = useState('');
  const [search, setSearch] = useState('');
  const [editOb, setEditOb] = useState<CompanyObligation | null>(null);
  const [editProtocolo, setEditProtocolo] = useState('');
  const [editNotas, setEditNotas] = useState('');

  const { data: companies = [] } = useCompanies();
  const { data: obligations = [], isLoading } = useCompanyObligations({
    companyId: filterCompany !== 'all' ? filterCompany : undefined,
    competencia: filterComp || undefined,
  });
  const updateStatus = useUpdateObligationStatus();

  const filtered = obligations.filter(ob => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ob.obligation_types?.nome?.toLowerCase().includes(q) ||
      ob.companies?.razao_social?.toLowerCase().includes(q)
    );
  });

  const handleChangeStatus = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  const handleSaveDetails = () => {
    if (!editOb) return;
    updateStatus.mutate({ id: editOb.id, status: editOb.status, protocolo: editProtocolo, notas: editNotas });
    setEditOb(null);
  };

  // Stats
  const stats = {
    total: filtered.length,
    pendente: filtered.filter(o => o.status === 'pendente').length,
    em_andamento: filtered.filter(o => o.status === 'em_andamento').length,
    enviado: filtered.filter(o => o.status === 'enviado').length,
    atrasado: filtered.filter(o => new Date(o.prazo) < new Date() && o.status !== 'enviado').length,
  };

  const now = new Date();
  const defaultComp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Central de Obrigações"
        description="Controle de obrigações acessórias — Kanban e tabela"
        actions={
          <div className="flex gap-2">
            <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>Kanban</Button>
            <Button variant={view === 'tabela' ? 'default' : 'outline'} size="sm" onClick={() => setView('tabela')}>Tabela</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card className="contab-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Total</p>
          <p className="text-xl font-bold font-mono">{stats.total}</p>
        </Card>
        <Card className="contab-card p-3">
          <p className="text-[10px] uppercase text-warning font-medium">Pendentes</p>
          <p className="text-xl font-bold font-mono text-warning">{stats.pendente}</p>
        </Card>
        <Card className="contab-card p-3">
          <p className="text-[10px] uppercase text-primary font-medium">Em Andamento</p>
          <p className="text-xl font-bold font-mono text-primary">{stats.em_andamento}</p>
        </Card>
        <Card className="contab-card p-3">
          <p className="text-[10px] uppercase text-success font-medium">Enviadas</p>
          <p className="text-xl font-bold font-mono text-success">{stats.enviado}</p>
        </Card>
        <Card className="contab-card p-3">
          <p className="text-[10px] uppercase text-danger font-medium">Atrasadas</p>
          <p className="text-xl font-bold font-mono text-danger">{stats.atrasado}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar obrigação ou empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={filterComp || defaultComp}
          onChange={e => setFilterComp(e.target.value)}
          className="w-[160px] h-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col}
              status={col}
              obligations={filtered.filter(o => o.status === col)}
              onChangeStatus={handleChangeStatus}
            />
          ))}
        </div>
      ) : (
        <Card className="contab-card">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Obrigação</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Empresa</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Competência</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Prazo</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Protocolo</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ob => {
                  const isOverdue = new Date(ob.prazo) < new Date() && ob.status !== 'enviado';
                  const statusCfg = STATUS_OPTIONS.find(s => s.value === ob.status)!;
                  return (
                    <tr key={ob.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${isOverdue ? 'bg-danger/5' : ''}`}>
                      <td className="p-3 font-medium text-foreground">{ob.obligation_types?.nome}</td>
                      <td className="p-3 text-muted-foreground text-xs">{ob.companies?.razao_social}</td>
                      <td className="p-3 font-mono text-xs">{ob.competencia}</td>
                      <td className="p-3 font-mono text-xs">{new Date(ob.prazo).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-center">
                        <StatusBadge status={isOverdue ? 'danger' : statusCfg.badge} label={isOverdue ? 'Atrasada' : statusCfg.label} />
                      </td>
                      <td className="p-3 text-xs font-mono text-muted-foreground">{ob.protocolo || '—'}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditOb(ob); setEditProtocolo(ob.protocolo || ''); setEditNotas(ob.notas || ''); }}>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma obrigação encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editOb} onOpenChange={v => !v && setEditOb(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Obrigação</DialogTitle>
          </DialogHeader>
          {editOb && (
            <div className="space-y-3 mt-2">
              <p className="text-sm font-medium">{editOb.obligation_types?.nome} — {editOb.companies?.razao_social}</p>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={editOb.status} onValueChange={v => setEditOb({ ...editOb, status: v as CompanyObligation['status'] })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Protocolo de Entrega</Label>
                <Input value={editProtocolo} onChange={e => setEditProtocolo(e.target.value)} placeholder="Nº do protocolo" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={3} />
              </div>
              <Button onClick={handleSaveDetails} className="w-full">Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
