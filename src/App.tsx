import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useDeadlineAlerts } from "@/hooks/use-deadline-alerts";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientesPage from "./pages/ClientesPage";
import ClienteDetailPage from "./pages/ClienteDetailPage";
import DocumentosPage from "./pages/DocumentosPage";
import LancamentosPage from "./pages/LancamentosPage";
import ConciliacaoPage from "./pages/ConciliacaoPage";
import FiscalPage from "./pages/FiscalPage";
import ObrigacoesPage from "./pages/ObrigacoesPage";
import DPPage from "./pages/DPPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import IAPage from "./pages/IAPage";
import AuditoriaPage from "./pages/AuditoriaPage";
import ConfigPage from "./pages/ConfigPage";
import CalendarioFiscalPage from "./pages/CalendarioFiscalPage";

const queryClient = new QueryClient();

const App = () => {
  useDeadlineAlerts();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="/obrigacoes" element={<ObrigacoesPage />} />
            <Route path="/dp" element={<DPPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/ia" element={<IAPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
