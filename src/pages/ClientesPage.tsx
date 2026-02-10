import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db, formatRegime } from '@/lib/data-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const clients = db.clients.getAll().filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj_cpf.includes(search)
  );

  const [form, setForm] = useState({
    name: '', cnpj_cpf: '', regime: 'Simples' as const, cnae: '', ie: '', im: '',
    address: '', phone: '', email: '',
  });

  const handleSave = () => {
    db.clients.save({
      ...form,
      id: crypto.randomUUID(),
      bank_accounts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setDialogOpen(false);
    setForm({ name: '', cnpj_cpf: '', regime: 'Simples', cnae: '', ie: '', im: '', address: '', phone: '', email: '' });
  };

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Clientes"
        description={`${clients.length} cliente(s) cadastrado(s)`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Razão Social / Nome</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">CNPJ / CPF</Label>
                    <Input value={form.cnpj_cpf} onChange={e => setForm(f => ({ ...f, cnpj_cpf: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Regime Tributário</Label>
                    <Select value={form.regime} onValueChange={v => setForm(f => ({ ...f, regime: v as any }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="Simples">Simples Nacional</SelectItem>
                        <SelectItem value="Presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="Real">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">CNAE</Label>
                    <Input value={form.cnae} onChange={e => setForm(f => ({ ...f, cnae: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
                </div>
                <Button onClick={handleSave} disabled={!form.name || !form.cnpj_cpf}>Salvar Cliente</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CNPJ/CPF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3">
        {clients.map(client => (
          <Link key={client.id} to={`/clientes/${client.id}`}>
            <Card className="contab-card hover:shadow-md cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  {client.cnpj_cpf.includes('/') ? (
                    <Building2 className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{client.cnpj_cpf}</p>
                </div>
                <StatusBadge
                  status="info"
                  label={formatRegime(client.regime)}
                  dot={false}
                />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{client.cnae}</p>
                  <p className="text-xs text-muted-foreground">{client.address.split(' - ').pop()}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {clients.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
