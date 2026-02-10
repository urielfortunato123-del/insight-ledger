import { useState } from 'react';
import { Bot, Send, AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db } from '@/lib/data-store';

export default function IAPage() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const alerts = db.aiAlerts.getAll();

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');

    // Simple rule-based responses
    setTimeout(() => {
      let response = 'Não tenho base suficiente para responder essa pergunta com confiança. Preciso de mais dados para dar uma resposta fundamentada.';

      if (userMsg.toLowerCase().includes('lucro') || userMsg.toLowerCase().includes('resultado')) {
        const entries = db.entries.getAll().filter(e => e.competence === '2025-01');
        const receitas = entries.flatMap(e => e.lines).filter(l => l.account_code.startsWith('4')).reduce((s, l) => s + l.credit, 0);
        const despesas = entries.flatMap(e => e.lines).filter(l => l.account_code.startsWith('5')).reduce((s, l) => s + l.debit, 0);
        response = `📊 Análise do Resultado — Jan/2025:\n\nReceitas: R$ ${receitas.toLocaleString('pt-BR')}\nDespesas: R$ ${despesas.toLocaleString('pt-BR')}\nResultado: R$ ${(receitas - despesas).toLocaleString('pt-BR')}\n\n📎 Fonte: ${entries.length} lançamentos contábeis de Jan/2025.\n\n⚡ Confiança: 92% (baseado em dados completos do período)`;
      } else if (userMsg.toLowerCase().includes('pendência') || userMsg.toLowerCase().includes('pendente')) {
        const docs = db.documents.getAll().filter(d => d.ocr_status === 'pending');
        const txs = db.transactions.getAll().filter(t => !t.matched);
        response = `📋 Pendências Identificadas:\n\n• ${docs.length} documento(s) com OCR pendente\n• ${txs.length} transação(ões) bancárias sem conciliação\n• DAS Fev/2025 ainda não localizado\n\n📎 Fonte: análise do checklist mensal.\n\n⚡ Confiança: 95%`;
      } else if (userMsg.toLowerCase().includes('imposto') || userMsg.toLowerCase().includes('das')) {
        response = `💰 Situação Fiscal — Simples Nacional:\n\nJan/2025: DAS R$ 1.234,56 — ✅ Pago\nFev/2025: DAS pendente de apuração\n\n⚠️ Alerta: Guia DAS Fev/2025 não localizada. Vencimento: 20/03/2025.\n\n📎 Fonte: módulo fiscal + documentos.\n\n⚡ Confiança: 88%`;
      }

      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 500);
  };

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="IA Copiloto"
        description="Sugestões, alertas e chat inteligente — Organiza, confere e prova."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-brand" /> Alertas e Sugestões
          </h2>
          {alerts.map(alert => (
            <Card key={alert.id} className="contab-card">
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 ${
                  alert.severity === 'error' ? 'text-danger' :
                  alert.severity === 'warning' ? 'text-warning' : 'text-primary'
                }`}>
                  {alert.severity === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                   alert.severity === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                   <Info className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <StatusBadge
                      status={alert.severity === 'error' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}
                      label={`${alert.confidence}%`}
                      dot={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    Refs: {alert.source_ids.join(', ')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat */}
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-brand" /> Chat Interno
          </h2>
          <Card className="contab-card flex-1 flex flex-col min-h-[400px]">
            <CardContent className="flex-1 flex flex-col p-4">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Pergunte sobre seus dados contábeis.</p>
                    <p className="text-xs mt-1">Ex: "Por que o lucro caiu?", "Quais pendências de janeiro?"</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Pergunte à IA..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <Button size="icon" onClick={handleSend}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
