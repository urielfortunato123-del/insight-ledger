import { useState } from 'react';
import { FileText, Search, Upload, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, formatCurrency, formatCompetence } from '@/lib/data-store';

export default function DocumentosPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const docs = db.documents.getAll().filter(d => {
    const matchesSearch = d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.file_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || d.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Documentos"
        description="Pasta digital com OCR e indexação"
        actions={
          <Button size="sm"><Upload className="w-4 h-4 mr-1" /> Upload</Button>
        }
      />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="nf_entrada">NF Entrada</SelectItem>
            <SelectItem value="nf_saida">NF Saída</SelectItem>
            <SelectItem value="extrato">Extrato</SelectItem>
            <SelectItem value="boleto">Boleto</SelectItem>
            <SelectItem value="guia">Guia</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="contab-card">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Arquivo</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Comp.</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">OCR</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="p-3">
                    <StatusBadge
                      status={doc.type.includes('saida') ? 'success' : doc.type.includes('entrada') ? 'warning' : 'muted'}
                      label={doc.type.replace(/_/g, ' ').toUpperCase()}
                      dot={false}
                    />
                  </td>
                  <td className="p-3 text-foreground">{doc.description}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{doc.file_name}</td>
                  <td className="p-3 text-muted-foreground">{formatCompetence(doc.competence)}</td>
                  <td className="p-3 text-right font-mono">{doc.value > 0 ? formatCurrency(doc.value) : '—'}</td>
                  <td className="p-3 text-center">
                    <StatusBadge
                      status={doc.ocr_status === 'done' ? 'success' : doc.ocr_status === 'error' ? 'danger' : 'warning'}
                      label={doc.ocr_status === 'done' ? 'OK' : 'Pendente'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {docs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum documento encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
