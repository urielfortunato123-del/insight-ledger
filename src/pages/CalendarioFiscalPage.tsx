import { useState, useMemo } from 'react';
import { CalendarIcon, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { db, formatCurrency, formatRegime } from '@/lib/data-store';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  type: 'tax' | 'obligation';
  label: string;
  subLabel: string;
  dueDate: string;
  value?: number;
  status: 'paid' | 'pending' | 'overdue' | 'sent';
  clientName: string;
  daysUntil: number;
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyColor(daysUntil: number, status: string): string {
  if (status === 'paid' || status === 'sent') return 'bg-success/15 border-success/30 text-success';
  if (daysUntil < 0) return 'bg-danger/15 border-danger/30 text-danger';
  if (daysUntil <= 3) return 'bg-danger/15 border-danger/30 text-danger';
  if (daysUntil <= 7) return 'bg-warning/15 border-warning/30 text-warning';
  if (daysUntil <= 15) return 'bg-brand/15 border-brand/30 text-brand';
  return 'bg-muted border-border text-muted-foreground';
}

function getUrgencyLabel(daysUntil: number, status: string): string {
  if (status === 'paid') return 'Pago';
  if (status === 'sent') return 'Enviada';
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d atrasado`;
  if (daysUntil === 0) return 'Hoje!';
  if (daysUntil === 1) return 'Amanhã';
  return `${daysUntil}d restantes`;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarioFiscalPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const events = useMemo(() => {
    const result: CalendarEvent[] = [];
    const clients = db.clients.getAll();
    const clientMap = new Map(clients.map(c => [c.id, c]));

    // Tax items
    for (const tp of db.taxPeriods.getAll()) {
      const client = clientMap.get(tp.client_id);
      for (const item of tp.items) {
        result.push({
          id: `tax_${item.id}`,
          type: 'tax',
          label: item.type,
          subLabel: `Imposto — ${formatRegime(client?.regime || '')}`,
          dueDate: item.due_date,
          value: item.value,
          status: item.paid ? 'paid' : getDaysUntil(item.due_date) < 0 ? 'overdue' : 'pending',
          clientName: client?.name || '',
          daysUntil: getDaysUntil(item.due_date),
        });
      }
    }

    // Obligations
    for (const ob of db.obligations.getAll()) {
      const client = clientMap.get(ob.client_id);
      result.push({
        id: `ob_${ob.id}`,
        type: 'obligation',
        label: ob.name,
        subLabel: `Obrigação — ${ob.regime}`,
        dueDate: ob.due_date,
        status: ob.status === 'enviada' ? 'sent' : ob.status === 'atrasada' ? 'overdue' : 'pending',
        clientName: client?.name || '',
        daysUntil: getDaysUntil(ob.due_date),
      });
    }

    return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [viewMonth, viewYear]);

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) calendarDays.push(null);
  for (let d = 1; d <= totalDays; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const eventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.dueDate === dateStr);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Upcoming alerts (next 30 days, not paid/sent)
  const alerts = events
    .filter(e => e.status !== 'paid' && e.status !== 'sent')
    .filter(e => e.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader title="Calendário Fiscal" description="Vencimentos de impostos e obrigações acessórias" />

      {/* Urgent alerts banner */}
      {alerts.filter(a => a.daysUntil <= 7).length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="text-sm font-semibold text-danger">Atenção — Vencimentos próximos</span>
          </div>
          <div className="space-y-1.5">
            {alerts.filter(a => a.daysUntil <= 7).map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.daysUntil < 0 ? 'bg-danger' : a.daysUntil <= 3 ? 'bg-danger animate-pulse' : 'bg-warning'}`} />
                  <span className="font-medium text-foreground">{a.label}</span>
                  <span className="text-muted-foreground">— {a.clientName}</span>
                  {a.value && <span className="font-mono text-xs text-muted-foreground">{formatCurrency(a.value)}</span>}
                </div>
                <span className={`text-xs font-semibold ${a.daysUntil < 0 ? 'text-danger' : a.daysUntil <= 3 ? 'text-danger' : 'text-warning'}`}>
                  {getUrgencyLabel(a.daysUntil, a.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="contab-card lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base font-semibold min-w-[160px] text-center">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}>
              Hoje
            </Button>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px mb-1">
              {WEEKDAY_NAMES.map(w => (
                <div key={w} className="text-center text-xs font-medium text-muted-foreground py-1">{w}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="h-20 bg-muted/20 rounded" />;

                const dayEvents = eventsForDay(day);
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={`day-${day}`}
                    className={cn(
                      "h-20 rounded p-1 border transition-colors",
                      isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border',
                      dayEvents.length > 0 ? 'bg-card' : 'bg-muted/20'
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium",
                      isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                    )}>
                      {day}
                    </span>
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          className={cn(
                            "text-[10px] px-1 py-0.5 rounded truncate border",
                            getUrgencyColor(ev.daysUntil, ev.status)
                          )}
                          title={`${ev.label} — ${ev.clientName}${ev.value ? ` — ${formatCurrency(ev.value)}` : ''}`}
                        >
                          {ev.label}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-danger/30 border border-danger/50" /> Vencido / Urgente</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-warning/30 border border-warning/50" /> Próximo (≤7d)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-brand/30 border border-brand/50" /> Em breve (≤15d)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-success/30 border border-success/50" /> Pago / Enviado</span>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: upcoming list */}
        <Card className="contab-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Próximos Vencimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum vencimento pendente</p>
              </div>
            )}
            {alerts.map(ev => (
              <div
                key={ev.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  getUrgencyColor(ev.daysUntil, ev.status)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{ev.label}</p>
                    <p className="text-xs opacity-80">{ev.subLabel}</p>
                    <p className="text-xs opacity-70 mt-0.5">{ev.clientName}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {ev.value && <p className="text-sm font-mono font-bold">{formatCurrency(ev.value)}</p>}
                    <p className="text-xs font-semibold mt-0.5">
                      {getUrgencyLabel(ev.daysUntil, ev.status)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10 text-xs opacity-70">
                  <span>{ev.dueDate.split('-').reverse().join('/')}</span>
                  <span className="flex items-center gap-1">
                    {ev.type === 'tax' ? <CalendarIcon className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {ev.type === 'tax' ? 'Imposto' : 'Obrigação'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
