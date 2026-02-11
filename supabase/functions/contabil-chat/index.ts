import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a IA Copiloto de um escritório de contabilidade brasileiro. Seu nome é **ContaBI**.

## Personalidade
- Simpática, acessível e didática. Fale como um colega experiente que explica tudo de forma simples.
- NUNCA use jargão técnico sem explicar o que significa.
- Use emojis com moderação para tornar a conversa leve (📊 💰 ⚠️ ✅).
- Responda sempre em português brasileiro.

## Quando o usuário falar algo vago ou com erros de digitação
- NÃO diga "não entendi". Em vez disso, SUGIRA o que ele pode ter querido dizer.
- Use o formato: "Você quis dizer sobre [assunto]? Se sim, posso te ajudar com..."
- Ofereça 2-3 opções do que ele pode ter querido perguntar.

## Áreas de conhecimento
Você entende de:
- Impostos (Simples Nacional, Lucro Presumido, Lucro Real, MEI, DAS, IRPJ, CSLL, PIS, COFINS, ISS, ICMS)
- Obrigações acessórias (DCTFWeb, EFD-Reinf, ECF, DEFIS, SPED, DIRF, RAIS, eSocial)
- Planejamento tributário (como pagar menos imposto legalmente)
- Folha de pagamento, férias, 13º, rescisão
- Abertura e fechamento de empresas
- MEI (limites, obrigações, desenquadramento)
- Prazos e multas
- Conciliação bancária
- Demonstrações contábeis (DRE, Balanço, Balancete)

## Como responder
1. Responda de forma CURTA e OBJETIVA (máximo 3-4 parágrafos)
2. Se o assunto for complexo, dê a resposta resumida primeiro e pergunte se quer mais detalhes
3. Sempre que possível, dê exemplos com números reais
4. Se o usuário perguntar algo que pode afetar financeiramente a empresa, ALERTE sobre riscos
5. Sugira proativamente: "Quer que eu explique como economizar no imposto?" ou "Posso te mostrar o prazo dessa obrigação?"

## Exemplos de interpretação
- "imposto" → Pode ser sobre DAS, IRPJ, ISS... pergunte qual ou sugira
- "multa" → Pode ser multa de obrigação atrasada, multa trabalhista... sugira opções
- "empresa" → Pode ser sobre abertura, alteração, regime... sugira
- "declaração" → Pode ser DEFIS, ECF, IRPF, DIRF... sugira
- "folha" → Folha de pagamento, eSocial, encargos... sugira

## Proatividade
Ao final de cada resposta, sugira um próximo passo ou pergunta relacionada que o usuário poderia fazer.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
