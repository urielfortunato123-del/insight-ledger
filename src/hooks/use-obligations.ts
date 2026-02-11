import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ObligationType {
  id: string;
  nome: string;
  periodicidade: 'mensal' | 'trimestral' | 'anual';
  esfera: 'federal' | 'estadual' | 'municipal';
  aplicavel_simples: boolean;
  aplicavel_presumido: boolean;
  aplicavel_real: boolean;
  aplicavel_mei: boolean;
  exige_folha: boolean;
  dia_vencimento: number | null;
}

export interface CompanyObligation {
  id: string;
  company_id: string;
  obligation_type_id: string;
  competencia: string;
  status: 'pendente' | 'em_andamento' | 'enviado' | 'retificar';
  prazo: string;
  protocolo: string | null;
  data_envio: string | null;
  enviado_por: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // joined
  obligation_types?: ObligationType;
  companies?: { razao_social: string; cnpj: string | null; regime_tributario: string };
}

export function useObligationTypes() {
  return useQuery({
    queryKey: ['obligation_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligation_types')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as ObligationType[];
    },
  });
}

export function useCompanyObligations(filters?: { companyId?: string; competencia?: string; status?: string }) {
  return useQuery({
    queryKey: ['company_obligations', filters],
    queryFn: async () => {
      let query = supabase
        .from('company_obligations')
        .select('*, obligation_types(*), companies(razao_social, cnpj, regime_tributario)')
        .order('prazo', { ascending: true });

      if (filters?.companyId) query = query.eq('company_id', filters.companyId);
      if (filters?.competencia) query = query.eq('competencia', filters.competencia);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as CompanyObligation[];
    },
  });
}

export function useUpdateObligationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, protocolo, notas }: { id: string; status: string; protocolo?: string; notas?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (protocolo !== undefined) updates.protocolo = protocolo;
      if (notas !== undefined) updates.notas = notas;
      if (status === 'enviado') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.data_envio = new Date().toISOString();
        updates.enviado_por = user?.id || null;
      }
      const { error } = await supabase.from('company_obligations').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company_obligations'] });
      toast.success('Status atualizado!');
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}

// Motor de regras: gera obrigações automáticas para uma empresa
export function useGenerateObligations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, regime, possuiFolha, competencia }: {
      companyId: string;
      regime: 'simples' | 'presumido' | 'real' | 'mei';
      possuiFolha: boolean;
      competencia: string; // 2025-01
    }) => {
      // Get all obligation types
      const { data: types, error: tErr } = await supabase.from('obligation_types').select('*');
      if (tErr) throw tErr;

      // Check already existing for this company + competência
      const { data: existing, error: eErr } = await supabase
        .from('company_obligations')
        .select('obligation_type_id')
        .eq('company_id', companyId)
        .eq('competencia', competencia);
      if (eErr) throw eErr;
      const existingIds = new Set((existing || []).map(e => e.obligation_type_id));

      // Filter applicable types
      const regimeMap: Record<string, string> = {
        simples: 'aplicavel_simples',
        presumido: 'aplicavel_presumido',
        real: 'aplicavel_real',
        mei: 'aplicavel_mei',
      };
      const regimeField = regimeMap[regime];

      const applicable = (types || []).filter(t => {
        if (!(t as Record<string, unknown>)[regimeField]) return false;
        if (t.exige_folha && !possuiFolha) return false;
        if (existingIds.has(t.id)) return false;
        return true;
      });

      if (applicable.length === 0) return 0;

      // Calculate due dates
      const [year, month] = competencia.split('-').map(Number);
      const rows = applicable.map(t => {
        const diaVenc = t.dia_vencimento || 20;
        // Due date is next month for monthly, or specific dates for others
        let dueYear = year;
        let dueMonth = month + 1;
        if (dueMonth > 12) { dueMonth = 1; dueYear++; }
        const prazo = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(diaVenc).padStart(2, '0')}`;

        return {
          company_id: companyId,
          obligation_type_id: t.id,
          competencia,
          status: 'pendente' as const,
          prazo,
        };
      });

      const { error } = await supabase.from('company_obligations').insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['company_obligations'] });
      if (count && count > 0) toast.success(`${count} obrigações geradas automaticamente!`);
      else toast.info('Nenhuma nova obrigação a gerar para este período.');
    },
    onError: (e) => toast.error(`Erro ao gerar obrigações: ${e.message}`),
  });
}
