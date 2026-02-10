import { Shield, Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db } from '@/lib/data-store';

export default function AuditoriaPage() {
  const [search, setSearch] = useState('');
  const logs = db.auditLogs.getAll().filter(l =>
    l.entity.includes(search.toLowerCase()) ||
    l.action.includes(search.toLowerCase()) ||
    l.entity_id.includes(search)
  );

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Auditoria" description="Trilha de prova imutável (append-only)" />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="contab-card">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Data/Hora</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Entidade</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">ID</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Ação</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Hash</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs">{new Date(log.at).toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-foreground capitalize">{log.entity.replace('_', ' ')}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{log.entity_id.slice(0, 12)}...</td>
                  <td className="p-3 text-center">
                    <StatusBadge
                      status={log.action === 'create' ? 'success' : log.action === 'delete' ? 'danger' : 'warning'}
                      label={log.action}
                      dot={false}
                    />
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{log.hash.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum log encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
