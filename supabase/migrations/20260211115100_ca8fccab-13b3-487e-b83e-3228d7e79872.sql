
-- =============================================
-- 1. COMPANIES (Empresas clientes do escritório)
-- =============================================
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT,
  regime_tributario TEXT NOT NULL CHECK (regime_tributario IN ('simples', 'presumido', 'real', 'mei')),
  possui_folha BOOLEAN NOT NULL DEFAULT false,
  estado TEXT,
  municipio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own companies" ON public.companies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. OBLIGATION_TYPES (Catálogo de obrigações)
-- =============================================
CREATE TABLE public.obligation_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  periodicidade TEXT NOT NULL CHECK (periodicidade IN ('mensal', 'trimestral', 'anual')),
  esfera TEXT NOT NULL CHECK (esfera IN ('federal', 'estadual', 'municipal')),
  aplicavel_simples BOOLEAN NOT NULL DEFAULT false,
  aplicavel_presumido BOOLEAN NOT NULL DEFAULT false,
  aplicavel_real BOOLEAN NOT NULL DEFAULT false,
  aplicavel_mei BOOLEAN NOT NULL DEFAULT false,
  exige_folha BOOLEAN NOT NULL DEFAULT false,
  dia_vencimento INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.obligation_types ENABLE ROW LEVEL SECURITY;

-- Catálogo é leitura pública para todos autenticados
CREATE POLICY "Authenticated users can read obligation types" ON public.obligation_types FOR SELECT TO authenticated USING (true);

-- Seed: obrigações mais comuns
INSERT INTO public.obligation_types (nome, periodicidade, esfera, aplicavel_simples, aplicavel_presumido, aplicavel_real, aplicavel_mei, exige_folha, dia_vencimento) VALUES
  ('DCTFWeb', 'mensal', 'federal', false, true, true, false, true, 15),
  ('EFD-Reinf', 'mensal', 'federal', false, true, true, false, true, 15),
  ('EFD-Contribuições', 'mensal', 'federal', false, true, true, false, false, 15),
  ('SPED Fiscal (EFD ICMS/IPI)', 'mensal', 'estadual', false, true, true, false, false, 20),
  ('DCTF', 'mensal', 'federal', false, true, true, false, false, 15),
  ('ECF', 'anual', 'federal', false, true, true, false, false, 31),
  ('ECD (SPED Contábil)', 'anual', 'federal', false, true, true, false, false, 31),
  ('DIRF', 'anual', 'federal', false, true, true, false, false, 28),
  ('DEFIS', 'anual', 'federal', true, false, false, false, false, 31),
  ('PGDAS-D', 'mensal', 'federal', true, false, false, false, false, 20),
  ('DAS-MEI', 'mensal', 'federal', false, false, false, true, false, 20),
  ('DASN-SIMEI', 'anual', 'federal', false, false, false, true, false, 31),
  ('RAIS', 'anual', 'federal', false, true, true, false, true, 31),
  ('eSocial', 'mensal', 'federal', true, true, true, false, true, 15),
  ('GIA', 'mensal', 'estadual', false, true, true, false, false, 15),
  ('ISS (Declaração)', 'mensal', 'municipal', true, true, true, false, false, 10),
  ('SINTEGRA', 'mensal', 'estadual', false, true, true, false, false, 15);

-- =============================================
-- 3. COMPANY_OBLIGATIONS (Obrigações por empresa)
-- =============================================
CREATE TABLE public.company_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  obligation_type_id UUID NOT NULL REFERENCES public.obligation_types(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL, -- formato: 2025-01
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'enviado', 'retificar')),
  prazo DATE NOT NULL,
  protocolo TEXT,
  data_envio TIMESTAMP WITH TIME ZONE,
  enviado_por UUID,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_obligations ENABLE ROW LEVEL SECURITY;

-- Usuário vê obrigações das suas empresas
CREATE POLICY "Users can manage obligations of own companies" ON public.company_obligations FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()));

CREATE TRIGGER update_company_obligations_updated_at BEFORE UPDATE ON public.company_obligations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_company_obligations_company ON public.company_obligations(company_id);
CREATE INDEX idx_company_obligations_status ON public.company_obligations(status);
CREATE INDEX idx_company_obligations_prazo ON public.company_obligations(prazo);

-- =============================================
-- 4. OBLIGATION_ATTACHMENTS (Protocolos/arquivos)
-- =============================================
CREATE TABLE public.obligation_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_obligation_id UUID NOT NULL REFERENCES public.company_obligations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.obligation_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage attachments of own obligations" ON public.obligation_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.company_obligations co 
    JOIN public.companies c ON c.id = co.company_id 
    WHERE co.id = company_obligation_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.company_obligations co 
    JOIN public.companies c ON c.id = co.company_id 
    WHERE co.id = company_obligation_id AND c.user_id = auth.uid()
  ));

-- =============================================
-- 5. Storage bucket para protocolos
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('obligation-files', 'obligation-files', false);

CREATE POLICY "Users can upload obligation files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'obligation-files');

CREATE POLICY "Users can view own obligation files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'obligation-files');
