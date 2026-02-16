import { useState } from 'react';
import { Download, ExternalLink, BookOpen, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ProgramaInfo {
  nome: string;
  descricao: string;
  downloadUrl: string;
  downloadLabel: string;
  prazo: string;
  passoAPasso: string[];
  dicasImportantes: string[];
}

const PROGRAMAS: ProgramaInfo[] = [
  {
    nome: 'EFD-Contribuições (PVA)',
    descricao: 'Usado para declarar PIS/COFINS mensais. Obrigatório para empresas no Lucro Presumido e Lucro Real.',
    downloadUrl: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital/escrituracao-fiscal-digital-efd-contribuicoes/escrituracao-fiscal-digital-efd-contribuicoes-programa',
    downloadLabel: 'Download EFD-Contribuições (Programa PVA)',
    prazo: '📤 Até o 10º dia útil do 2º mês seguinte ao mês de apuração (ex: Jan → entrega até ~meados de março)',
    passoAPasso: [
      '1. Baixe e instale o Programa Validador e Assinador (PVA) da EFD-Contribuições no site da Receita Federal.',
      '2. Abra o PVA e clique em "Nova Escrituração" → selecione o período de apuração (mês/ano).',
      '3. Preencha os dados da empresa: CNPJ, razão social, regime tributário (Lucro Presumido ou Real).',
      '4. Importe o arquivo TXT gerado pelo seu sistema contábil (menu Escrituração → Importar).',
      '5. Caso não tenha arquivo TXT, preencha manualmente: vá em "Registros" → adicione as notas fiscais de saída e entrada do período.',
      '6. No bloco M (Apuração), o programa calcula automaticamente o PIS (0,65%) e COFINS (3%) sobre o faturamento.',
      '7. Clique em "Validar" para verificar se há erros ou inconsistências.',
      '8. Corrija eventuais erros apontados na validação (campos obrigatórios, valores divergentes, etc.).',
      '9. Após validar com sucesso, clique em "Assinar" → selecione seu certificado digital (e-CNPJ ou e-CPF do responsável).',
      '10. Clique em "Transmitir" → o arquivo é enviado para a Receita Federal. Guarde o recibo de entrega.',
    ],
    dicasImportantes: [
      '⚠️ Você precisa de um certificado digital válido (e-CNPJ A1 ou A3) para assinar e transmitir.',
      '💡 Sempre valide o arquivo ANTES de assinar — erros após a assinatura exigem retificação.',
      '📊 Se a empresa não teve faturamento no mês, ainda assim deve enviar a EFD "zerada" (sem movimento).',
      '🔄 Para retificar, gere um novo arquivo com a opção "Retificadora" e envie novamente.',
      '📅 Multa por atraso: R$ 500/mês (Lucro Presumido) ou R$ 1.500/mês (Lucro Real).',
    ],
  },
  {
    nome: 'SPED ECF (Escrituração Contábil Fiscal)',
    descricao: 'Declaração anual que substitui a DIPJ. Obrigatória para Lucro Presumido e Lucro Real. Contém informações fiscais e de cálculo do IRPJ e CSLL.',
    downloadUrl: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital/escrituracao-contabil-fiscal-ecf/sped-programa-sped-contabil-fiscal',
    downloadLabel: 'Download SPED ECF (Validador/Assinador)',
    prazo: '📤 Até o último dia útil de julho do ano seguinte (ex: exercício 2025 → entrega até julho/2026)',
    passoAPasso: [
      '1. Baixe e instale o programa SPED ECF no site da Receita Federal.',
      '2. Abra o programa e clique em "Nova ECF" → informe o ano-calendário (ex: 2025).',
      '3. Preencha o Registro 0000: dados da empresa (CNPJ, razão social, regime tributário, código município).',
      '4. Registro 0010: informe o regime de apuração do IRPJ/CSLL (Lucro Presumido ou Real) e a forma de tributação.',
      '5. Se a empresa é Lucro Presumido, preencha o Bloco P — informe o faturamento trimestral para cálculo automático do IRPJ/CSLL.',
      '6. No Bloco P, o programa aplica a presunção de 32% (serviços) ou 8% (comércio) sobre a receita bruta.',
      '7. Importe a ECD (se obrigatório) pelo menu "Recuperar ECD" — isso puxa automaticamente os dados contábeis.',
      '8. Preencha o Bloco Y com informações complementares (sócios, rendimentos, pagamentos ao exterior, etc.).',
      '9. Valide o arquivo clicando em "Validar" — corrija todos os erros e avisos.',
      '10. Assine com certificado digital (e-CNPJ) e transmita. Guarde o recibo.',
    ],
    dicasImportantes: [
      '⚠️ A ECF deve ser assinada pelo contador (CRC) E pelo representante legal da empresa.',
      '💡 Se a empresa entregou a ECD, recupere-a antes de preencher a ECF — evita divergências.',
      '📊 O Lucro Presumido precisa declarar receita por trimestre nos registros P100/P200.',
      '🔄 É possível retificar até 5 anos. Gere novo arquivo como "ECF Retificadora".',
      '📅 Multa por atraso: 0,25% do lucro líquido por mês (mínimo R$ 500 para Presumido, R$ 1.500 para Real).',
      '🏛️ A ECF substituiu a antiga DIPJ desde 2015.',
    ],
  },
  {
    nome: 'SPED ECD (Escrituração Contábil Digital)',
    descricao: 'Livro contábil digital (Livro Diário e Razão). Obrigatório para Lucro Presumido (que distribuiu lucros acima da presunção) e Lucro Real.',
    downloadUrl: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital/escrituracao-contabil-digital-ecd/escrituracao-contabil-digital-programa',
    downloadLabel: 'Download SPED ECD (Validador/Assinador)',
    prazo: '📤 Até o último dia útil de junho do ano seguinte (ex: exercício 2025 → entrega até junho/2026)',
    passoAPasso: [
      '1. Baixe e instale o programa SPED ECD (PVA) no site da Receita Federal.',
      '2. No seu sistema contábil, exporte o arquivo da ECD no formato TXT padrão do SPED.',
      '3. Abra o PVA da ECD e clique em "Importar" → selecione o arquivo TXT gerado.',
      '4. O programa carregará todos os lançamentos contábeis do período (Livro Diário).',
      '5. Verifique os registros: Registro I010 (identificação do livro), I050 (plano de contas), I150 (saldos periódicos), I200/I250 (lançamentos).',
      '6. Confira se o Balanço Patrimonial e DRE estão corretos nos registros J100 e J150.',
      '7. No registro J800, você pode anexar o Balanço e DRE em PDF (opcional mas recomendado).',
      '8. Clique em "Validar" — o programa verifica a integridade de todos os lançamentos (débito = crédito, saldos, etc.).',
      '9. Assine o arquivo com certificado digital: primeiro o contador (e-CPF com CRC), depois o responsável legal (e-CNPJ).',
      '10. Transmita pelo ReceitaNet (integrado ao PVA). Guarde o recibo e o termo de autenticação.',
    ],
    dicasImportantes: [
      '⚠️ A ECD exige DUAS assinaturas: contador (com CRC ativo) + representante legal.',
      '💡 No Lucro Presumido, a ECD só é obrigatória se a empresa distribuiu lucros acima da presunção fiscal. Caso contrário, é facultativa.',
      '📊 Todos os lançamentos devem estar equilibrados (débito = crédito). O PVA rejeita arquivos desbalanceados.',
      '🔄 Substituição: é possível substituir a ECD já enviada, gerando um novo arquivo com o hash da anterior.',
      '📅 Multa por atraso: R$ 500/mês (Lucro Presumido) ou R$ 1.500/mês (Lucro Real).',
      '📚 A ECD substitui os livros contábeis em papel (Diário e Razão). Tem valor jurídico após autenticação.',
    ],
  },
];

function ProgramaCard({ programa }: { programa: ProgramaInfo }) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0 pb-4 last:pb-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-foreground">{programa.nome}</p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{programa.descricao}</p>
      <p className="text-xs text-muted-foreground mb-2 font-medium">{programa.prazo}</p>

      <div className="flex flex-wrap gap-2 mb-2">
        <a
          href={programa.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Download className="w-3 h-3" /> {programa.downloadLabel}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Collapsible open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand/80 transition-colors cursor-pointer">
          <BookOpen className="w-3 h-3" />
          Como usar — Passo a passo
          <ChevronDown className={cn("w-3 h-3 transition-transform", isGuideOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-xs font-semibold text-foreground mb-2">📋 Passo a passo:</p>
            <ol className="space-y-1.5">
              {programa.passoAPasso.map((passo, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">{passo}</li>
              ))}
            </ol>
          </div>

          <div className="bg-warning/5 rounded-lg p-3 border border-warning/20">
            <p className="text-xs font-semibold text-foreground mb-2">💡 Dicas importantes:</p>
            <ul className="space-y-1.5">
              {programa.dicasImportantes.map((dica, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">{dica}</li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function SpedProgramasGuide() {
  return (
    <>
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-6">
        <Download className="w-4 h-4 text-brand" /> Programas e Downloads SPED
      </h2>

      <Card className="contab-card">
        <CardContent className="p-4 space-y-4">
          {PROGRAMAS.map((prog) => (
            <ProgramaCard key={prog.nome} programa={prog} />
          ))}

          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Todos os programas do SPED em um só lugar:</p>
            <a
              href="https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Portal SPED — Receita Federal
            </a>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
