import { useEffect, useRef } from 'react';
import { db } from '@/lib/data-store';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

export function useDeadlineAlerts() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tax items pending
    const allTax = db.taxPeriods.getAll();
    const urgentTax: { type: string; due: string; days: number }[] = [];
    allTax.forEach(tp => {
      tp.items.filter(i => !i.paid).forEach(item => {
        const days = differenceInDays(parseISO(item.due_date), today);
        if (days <= 3) {
          urgentTax.push({ type: item.type, due: item.due_date, days });
        }
      });
    });

    // Obligations pending
    const allOb = db.obligations.getAll();
    const urgentOb: { name: string; due: string; days: number }[] = [];
    allOb.filter(o => o.status !== 'enviada').forEach(ob => {
      const days = differenceInDays(parseISO(ob.due_date), today);
      if (days <= 3) {
        urgentOb.push({ name: ob.name, due: ob.due_date, days });
      }
    });

    const total = urgentTax.length + urgentOb.length;
    if (total === 0) return;

    // Small delay so the UI renders first
    setTimeout(() => {
      if (urgentTax.length > 0) {
        const overdue = urgentTax.filter(t => t.days < 0);
        const upcoming = urgentTax.filter(t => t.days >= 0);

        if (overdue.length > 0) {
          toast.error(`${overdue.length} imposto(s) vencido(s)!`, {
            description: overdue.map(t => `${t.type} — ${t.due.split('-').reverse().join('/')}`).join(', '),
            duration: 8000,
          });
        }
        if (upcoming.length > 0) {
          toast.warning(`${upcoming.length} imposto(s) vencem em até 3 dias`, {
            description: upcoming.map(t => `${t.type} — ${t.due.split('-').reverse().join('/')}`).join(', '),
            duration: 8000,
          });
        }
      }

      if (urgentOb.length > 0) {
        toast.warning(`${urgentOb.length} obrigação(ões) com prazo próximo`, {
          description: urgentOb.map(o => `${o.name} — ${o.due.split('-').reverse().join('/')}`).join(', '),
          duration: 8000,
        });
      }
    }, 1500);
  }, []);
}
