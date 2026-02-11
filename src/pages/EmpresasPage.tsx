import { useState } from 'react';
import { Building2, Plus, Trash2, RefreshCw, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useCompanies, useCreateCompany, useDeleteCompany } from '@/hooks/use-companies';
import { useGenerateObligations } from '@/hooks/use-obligations';
import { useCompanyObligations } from '@/hooks/use-obligations';

const REGIMES = [
  { value: 'mei', label: 'MEI' },
  { value: 'simples', label: 'Simples Nacional' },
  { value: 'presumido', label: 'Lucro Presumido' },
  { value: 'real', label: 'Lucro Real' },
];

export default function EmpresasPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const { data: allObligations = [] } = useCompanyObligations();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const generateObligations = useGenerateObligations();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    razao_social: '',
    cnpj: '',
    regime_tributario: '' as string,
    possui_folha: false,
    estado: '',
    municipio: '',
  });

  const handleCreate = async () => {
    if (!form.razao_social || !form.regime_tributario) return;
    const company = await createCompany.mutateAsync({
      razao_social: form.razao_social,
      cnpj: form.cnpj || null,
      regime_tributario: form.regime_tributario as 'simples' | 'presumido' | 'real' | 'mei',
      possui_folha: form.possui_folha,
      estado: form.estado || null,
      municipio: form.municipio || null,
    });
    // Auto-generate obligations for current month
    const now = new Date();
    const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await generateObligations.mutateAsync({
      companyId: company.id,
      regime: company.regime_tributario,
      possuiFolha: company.possui_folha,
      competencia,
    });
    setForm({ razao_social: '', cnpj: '', regime_tributario: '', possui_folha: false, estado: '', municipio: '' });
    setOpen(false);
  };

  const handleGenerateAll = async (companyId: string, regime: string, possuiFolha: boolean) => {
    const now = new Date();
    const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await generateObligations.mutateAsync({
      companyId,
      regime: regime as 'simples' | 'presumido' | 'real' | 'mei',
      possuiFolha,
      competencia,
    });
  };

  const getCompanyStats = (companyId: string) => {
    const obs = allObligations.filter(o => o.company_id === companyId);
    return {
      total: obs.length,
      pendente: obs.filter(o => o.status === 'pendente').length,
      enviado: obs.filter(o => o.status === 'enviado').length,
      atrasado: obs.filter(o => new Date(o.prazo) < new Date() && o.status !== 'enviado').length,
    };
  };

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Empresas"
        description="Cadastro e gestão de empresas do escritório"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Empresa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Empresa</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label className="text-xs">Razão Social *</Label>
                  <Input value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">CNPJ</Label>
                  <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Regime Tributário *</Label>
                  <Select value={form.regime_tributario} onValueChange={v => setForm(f => ({ ...f, regime_tributario: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {REGIMES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.possui_folha} onCheckedChange={v => setForm(f => ({ ...f, possui_folha: !!v }))} id="folha" />
                  <Label htmlFor="folha" className="text-xs">Possui folha de pagamento</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} placeholder="SP" className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Município</Label>
                    <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} className="h-9" />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createCompany.isPending || !form.razao_social || !form.regime_tributario}>
                  {createCompany.isPending ? 'Salvando...' : 'Cadastrar e Gerar Obrigações'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : companies.length === 0 ? (
        <Card className="contab-card">
          <CardContent className="text-center py-12 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma empresa cadastrada</p>
            <p className="text-xs mt-1">Clique em "Nova Empresa" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => {
            const stats = getCompanyStats(c.id);
            const regimeLabel = REGIMES.find(r => r.value === c.regime_tributario)?.label || c.regime_tributario;
            return (
              <Card key={c.id} className="contab-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="truncate">{c.razao_social}</span>
                  </CardTitle>
                  {c.cnpj && <p className="text-xs text-muted-foreground font-mono">{c.cnpj}</p>}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status="info" label={regimeLabel} dot={false} />
                    {c.possui_folha && <StatusBadge status="muted" label="Folha" dot={false} />}
                    {c.estado && <span className="text-xs text-muted-foreground">{c.estado}</span>}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                    <span>{stats.total} obrig.</span>
                    {stats.pendente > 0 && <span className="text-warning">{stats.pendente} pend.</span>}
                    {stats.atrasado > 0 && <span className="text-danger">{stats.atrasado} atras.</span>}
                    {stats.enviado > 0 && <span className="text-success">{stats.enviado} env.</span>}
                  </div>
                  <div className="flex gap-1 pt-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleGenerateAll(c.id, c.regime_tributario, c.possui_folha)}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Gerar Mês
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-danger" onClick={() => deleteCompany.mutate(c.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
