import { useRef, useState } from 'react';
import { Settings, Database, FolderOpen, Save, Upload, CheckCircle2, Cloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { db } from '@/lib/data-store';
import { toast } from 'sonner';
import { backupToGoogleDrive, restoreFromGoogleDrive } from '@/lib/google-drive';

export default function ConfigPage() {
  const accounts = db.chartAccounts.getAll();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [driveLoading, setDriveLoading] = useState(false);

  const handleBackup = () => {
    try {
      const data: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('contabia_')) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key) || '[]');
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      }

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `contabia_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Backup realizado com sucesso!');
    } catch (err) {
      console.error('Backup error:', err);
      toast.error('Erro ao gerar backup. Verifique o console.');
    }
  };

  const getBackupData = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('contabia_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    return data;
  };

  const handleDriveBackup = async () => {
    setDriveLoading(true);
    try {
      const data = getBackupData();
      const { fileName } = await backupToGoogleDrive(data);
      toast.success(`Backup enviado para Google Drive: ${fileName}`);
    } catch (err: unknown) {
      console.error('Google Drive backup error:', err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro no backup Google Drive: ${msg}`);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveRestore = async () => {
    setDriveLoading(true);
    try {
      const result = await restoreFromGoogleDrive();
      if (!result) {
        toast.info('Nenhum backup encontrado no Google Drive.');
        return;
      }
      let count = 0;
      for (const [key, value] of Object.entries(result.data)) {
        if (key.startsWith('contabia_')) {
          localStorage.setItem(key, JSON.stringify(value));
          count++;
        }
      }
      setRestoreStatus(`${count} coleção(ões) restaurada(s) do Drive`);
      toast.success(`Restaurado de ${result.fileName}! Recarregando...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      console.error('Google Drive restore error:', err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao restaurar do Drive: ${msg}`);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleRestore = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        let count = 0;

        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('contabia_')) {
            localStorage.setItem(key, JSON.stringify(value));
            count++;
          }
        }

        setRestoreStatus(`${count} coleção(ões) restaurada(s)`);
        toast.success(`Backup restaurado! ${count} coleção(ões) importada(s). Recarregando...`);
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error('Restore error:', err);
        toast.error('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Configurações" description="Plano de contas, backup e preferências" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup */}
        <Card className="contab-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" /> Backup & Restauração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Faça backup completo dos dados locais em JSON. Restaure a partir de um arquivo salvo anteriormente.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleBackup} size="sm">
                <Save className="w-4 h-4 mr-1" /> Backup Agora
              </Button>
              <Button onClick={handleRestore} size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-1" /> Restaurar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={onFileSelected}
              />
            </div>
            {restoreStatus && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {restoreStatus}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Google Drive Backup */}
        <Card className="contab-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4" /> Backup Google Drive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Envie ou restaure backups diretamente do seu Google Drive. Os arquivos ficam na pasta "ContabIA Backups".
            </p>
            <div className="flex gap-2">
              <Button onClick={handleDriveBackup} size="sm" disabled={driveLoading}>
                {driveLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Cloud className="w-4 h-4 mr-1" />}
                Enviar p/ Drive
              </Button>
              <Button onClick={handleDriveRestore} size="sm" variant="outline" disabled={driveLoading}>
                {driveLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Restaurar do Drive
              </Button>
            </div>
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
