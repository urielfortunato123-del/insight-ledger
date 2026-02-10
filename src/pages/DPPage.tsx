import { UserCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';

export default function DPPage() {
  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Departamento Pessoal"
        description="Cadastro de funcionários e folha simplificada"
        actions={
          <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Funcionário</Button>
        }
      />

      <Card className="contab-card">
        <CardContent className="text-center py-16">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-1">Módulo de Departamento Pessoal</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Cadastre funcionários, gerencie folha de pagamento simplificada e organize documentos trabalhistas.
            Sem integração governamental no MVP — apenas organização e controle.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
