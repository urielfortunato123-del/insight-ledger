import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useDeadlineAlerts } from "@/hooks/use-deadline-alerts";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ClientesPage from "./pages/ClientesPage";
import ClienteDetailPage from "./pages/ClienteDetailPage";
import DocumentosPage from "./pages/DocumentosPage";
import LancamentosPage from "./pages/LancamentosPage";
import ConciliacaoPage from "./pages/ConciliacaoPage";
import FiscalPage from "./pages/FiscalPage";
import ObrigacoesPage from "./pages/ObrigacoesPage";
import EmpresasPage from "./pages/EmpresasPage";
import ObrigacoesCOCPage from "./pages/ObrigacoesCOCPage";
import DPPage from "./pages/DPPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import IAPage from "./pages/IAPage";
import AuditoriaPage from "./pages/AuditoriaPage";
import ConfigPage from "./pages/ConfigPage";
import CalendarioFiscalPage from "./pages/CalendarioFiscalPage";
import FechamentoMesPage from "./pages/FechamentoMesPage";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  useDeadlineAlerts();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/:id" element={<ClienteDetailPage />} />
        <Route path="/documentos" element={<DocumentosPage />} />
        <Route path="/lancamentos" element={<LancamentosPage />} />
        <Route path="/conciliacao" element={<ConciliacaoPage />} />
        <Route path="/fiscal" element={<FiscalPage />} />
        <Route path="/calendario" element={<CalendarioFiscalPage />} />
        <Route path="/empresas" element={<EmpresasPage />} />
        <Route path="/obrigacoes-coc" element={<ObrigacoesCOCPage />} />
        <Route path="/obrigacoes" element={<ObrigacoesPage />} />
        <Route path="/dp" element={<DPPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/ia" element={<IAPage />} />
        <Route path="/auditoria" element={<AuditoriaPage />} />
        <Route path="/fechamento" element={<FechamentoMesPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
