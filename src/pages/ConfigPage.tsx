import { Settings, Database, FolderOpen, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/lib/data-store';

export default function ConfigPage() {
  const accounts = db.chartAccounts.getAll();

  const handleBackup = () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('contabia_')) {
        data[key] = JSON.parse(localStorage.getItem(key) || '[]');
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contabia_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Configurações" description="Plano de contas, backup e preferências" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup */}
        <Card className="contab-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" /> Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Faça backup completo dos dados locais. O arquivo JSON contém todos os clientes, documentos, lançamentos e configurações.
            </p>
            <Button onClick={handleBackup} size="sm">
              <Save className="w-4 h-4 mr-1" /> Backup Agora
            </Button>
          </CardContent>
        </Card>

        {/* Vault */}
        <Card className="contab-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Vault (Armazenamento)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Documentos armazenados localmente no navegador. Em versão futura, haverá suporte a pasta local vault/ com organização por cliente/ano-mês/tipo.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Caminho: <span className="font-mono">localStorage (PWA)</span>
            </p>
          </CardContent>
        </Card>

        {/* Chart of accounts */}
        <Card className="contab-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" /> Plano de Contas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Código</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Conta</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Nível</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs font-medium text-foreground">{acc.code}</td>
                    <td className="p-3 text-foreground" style={{ paddingLeft: `${acc.level * 16 + 12}px` }}>
                      {acc.level === 1 ? <strong>{acc.name}</strong> : acc.name}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground capitalize">{acc.type}</td>
                    <td className="p-3 text-center text-xs text-muted-foreground">{acc.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
