import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, BookOpen, ArrowLeftRight,
  Calculator, ClipboardList, UserCheck, BarChart3, Bot,
  Shield, Settings, Search, Menu, ChevronLeft, Zap, Moon, Sun, CalendarDays
} from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Documentos', icon: FileText, path: '/documentos' },
  { label: 'Lançamentos', icon: BookOpen, path: '/lancamentos' },
  { label: 'Conciliação', icon: ArrowLeftRight, path: '/conciliacao' },
  { label: 'Fiscal', icon: Calculator, path: '/fiscal' },
  { label: 'Calendário', icon: CalendarDays, path: '/calendario' },
  { label: 'Obrigações', icon: ClipboardList, path: '/obrigacoes' },
  { label: 'Depto Pessoal', icon: UserCheck, path: '/dp' },
  { label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
  { label: 'IA Copiloto', icon: Bot, path: '/ia' },
  { label: 'Auditoria', icon: Shield, path: '/auditoria' },
  { label: 'Configurações', icon: Settings, path: '/config' },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 px-4 border-b border-sidebar-border",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
            <Zap className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-accent-foreground tracking-tight">ContabIA</span>
              <span className="text-[10px] text-sidebar-muted leading-none">Local</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "sidebar-link-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="flex items-center h-14 px-6 border-b border-border bg-card shrink-0 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes, documentos, lançamentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:bg-card focus-visible:ring-1"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <span className="text-xs text-muted-foreground font-medium px-2 py-1 rounded bg-muted">
              DEMO
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
