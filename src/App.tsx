import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy } from "react";

// Lazy load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ShareView = lazy(() => import("./pages/ShareView"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Proposals = lazy(() => import("./pages/Proposals"));
const ProposalBuilder = lazy(() => import("./pages/ProposalBuilder"));
const ProposalView = lazy(() => import("./pages/ProposalView"));
const ProposalShareView = lazy(() => import("./pages/ProposalShareView"));
const AdminServices = lazy(() => import("./pages/AdminServices"));
const ProposalTemplates = lazy(() => import("./pages/ProposalTemplates"));
const PackageComparison = lazy(() => import("./pages/PackageComparison"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const AIToolsTracking = lazy(() => import("./pages/AIToolsTracking"));
const AITransformation = lazy(() => import("./pages/AITransformation"));
const ContentUploader = lazy(() => import("./pages/ContentUploader"));
const ContentCalendar = lazy(() => import("./pages/ContentCalendar"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

import { CommandPalette } from "@/components/CommandPalette";
import { CookieConsent } from "@/components/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CommandPalette />
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/share/:token" element={<ShareView />} />
              <Route path="/proposal/:token" element={<ProposalShareView />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/:id"
                element={
                  <ProtectedRoute>
                    <ClientDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/services"
                element={
                  <ProtectedRoute>
                    <AdminServices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proposals"
                element={
                  <ProtectedRoute>
                    <Proposals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proposals/templates"
                element={
                  <ProtectedRoute>
                    <ProposalTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proposals/new"
                element={
                  <ProtectedRoute>
                    <ProposalBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proposals/:id"
                element={
                  <ProtectedRoute>
                    <ProposalView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proposals/:id/edit"
                element={
                  <ProtectedRoute>
                    <ProposalBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/package-comparison"
                element={
                  <ProtectedRoute>
                    <PackageComparison />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/time-tracking"
                element={
                  <ProtectedRoute>
                    <TimeTracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-tools"
                element={
                  <ProtectedRoute>
                    <AIToolsTracking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-transformation"
                element={
                  <ProtectedRoute>
                    <AITransformation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/content-uploader"
                element={
                  <ProtectedRoute>
                    <ContentUploader />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/content-calendar"
                element={
                  <ProtectedRoute>
                    <ContentCalendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-portal"
                element={
                  <ProtectedRoute>
                    <ClientPortal />
                  </ProtectedRoute>
                }
              />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
