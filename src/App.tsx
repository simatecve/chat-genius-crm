import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import WhatsAppConnections from "./pages/WhatsAppConnections";
import AIAgents from "./pages/AIAgents";
import CreateAIAgent from "./pages/CreateAIAgent";
import ContactLists from "./pages/ContactLists";
import Contacts from "./pages/Contacts";
import Campaigns from "./pages/Campaigns";
import CreateCampaign from "./pages/CreateCampaign";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import Conversations from "./pages/Conversations";
import PaymentPlans from "./pages/PaymentPlans";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import PaymentPending from "./pages/PaymentPending";
import UsagePlan from "./pages/UsagePlan";
import NotFound from "./pages/NotFound";
// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPaymentPlans from "./pages/admin/AdminPaymentPlans";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods";
import AdminStatistics from "./pages/admin/AdminStatistics";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminConversations from "./pages/admin/AdminConversations";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/conexiones" element={
              <ProtectedRoute>
                <WhatsAppConnections />
              </ProtectedRoute>
            } />
            <Route path="/asistente-ia" element={
              <ProtectedRoute>
                <AIAgents />
              </ProtectedRoute>
            } />
            <Route path="/crear-agente" element={
              <ProtectedRoute>
                <CreateAIAgent />
              </ProtectedRoute>
            } />
            <Route path="/listas-contactos" element={
              <ProtectedRoute>
                <ContactLists />
              </ProtectedRoute>
            } />
            <Route path="/contactos/:listId" element={
              <ProtectedRoute>
                <Contacts />
              </ProtectedRoute>
            } />
            <Route path="/campanas-masivas" element={
              <ProtectedRoute>
                <Campaigns />
              </ProtectedRoute>
            } />
            <Route path="/crear-campana" element={
              <ProtectedRoute>
                <CreateCampaign />
              </ProtectedRoute>
            } />
            <Route path="/crear-campana/:id" element={
              <ProtectedRoute>
                <CreateCampaign />
              </ProtectedRoute>
            } />
            <Route path="/configuracion" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/leads" element={
              <ProtectedRoute>
                <Leads />
              </ProtectedRoute>
            } />
            <Route path="/conversaciones" element={
              <ProtectedRoute>
                <Conversations />
              </ProtectedRoute>
            } />
            <Route path="/planes-pago" element={
              <ProtectedRoute>
                <PaymentPlans />
              </ProtectedRoute>
            } />
            <Route path="/payment-success" element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            } />
            <Route path="/payment-failure" element={
              <ProtectedRoute>
                <PaymentFailure />
              </ProtectedRoute>
            } />
            <Route path="/payment-pending" element={
              <ProtectedRoute>
                <PaymentPending />
              </ProtectedRoute>
            } />
            <Route path="/uso-plan" element={
              <ProtectedRoute>
                <UsagePlan />
              </ProtectedRoute>
            } />
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/usuarios" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/planes" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminPaymentPlans />
              </ProtectedRoute>
            } />
            <Route path="/admin/metodos-pago" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminPaymentMethods />
              </ProtectedRoute>
            } />
            <Route path="/admin/estadisticas" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminStatistics />
              </ProtectedRoute>
            } />
            <Route path="/admin/mensajes" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminMessages />
              </ProtectedRoute>
            } />
            <Route path="/admin/conversaciones" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminConversations />
              </ProtectedRoute>
            } />
            <Route path="/admin/gestion-suscripciones" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminSubscriptions />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
