import { useState, useRef, useEffect } from 'react';
import { Bot, Send, AlertTriangle, Info, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db } from '@/lib/data-store';
import { toast } from 'sonner';
import { SpedProgramasGuide } from '@/components/SpedProgramasGuide';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contabil-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (resp.status === 429) {
    toast.error('Muitas requisições. Aguarde um momento.');
    onDone();
    return;
  }
  if (resp.status === 402) {
    toast.error('Créditos de IA esgotados.');
    onDone();
    return;
  }
  if (!resp.ok || !resp.body) {
    toast.error('Erro ao conectar com a IA.');
    onDone();
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (raw.startsWith(':') || raw.trim() === '') continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

export default function IAPage() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const alerts = db.aiAlerts.getAll();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!chatInput.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      toast.error('Erro ao se comunicar com a IA.');
    }
  };

  const quickQuestions = [
    'Como pagar menos imposto?',
    'O que é o Simples Nacional?',
    'Quais obrigações vencem esse mês?',
    'Como abrir uma empresa?',
  ];

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="IA Copiloto"
        description="Converse naturalmente — pergunte qualquer coisa sobre contabilidade, impostos e obrigações."
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

          <SpedProgramasGuide />
        </div>

        {/* Chat */}
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-brand" /> Chat Inteligente
          </h2>
          <Card className="contab-card flex-1 flex flex-col min-h-[400px]">
            <CardContent className="flex-1 flex flex-col p-4">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-6">
                    <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Olá! Sou a ContaBI 👋</p>
                    <p className="text-xs mt-1 mb-4">Pode falar do jeito que quiser — eu entendo!</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickQuestions.map((q) => (
                        <button
                          key={q}
                          onClick={() => { setChatInput(q); }}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Pensando...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Fale qualquer coisa sobre contabilidade..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                />
                <Button size="icon" onClick={handleSend} disabled={isLoading || !chatInput.trim()}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
