import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import MemberDetail from "@/pages/MemberDetail";
import MemberNew from "@/pages/MemberNew";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import CourseNew from "@/pages/CourseNew";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import StubPage from "@/pages/StubPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/new" element={<MemberNew />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/courses" element={<StubPage title="Kurse" />} />
            <Route path="/courses/:id" element={<StubPage title="Kurs-Detail" />} />
            <Route path="/events" element={<StubPage title="Termine" />} />
            <Route path="/events/:id" element={<StubPage title="Termin-Detail" />} />
            <Route path="/attendance" element={<StubPage title="Anwesenheit" />} />
            <Route path="/attendance/:eventId" element={<StubPage title="Check-In" />} />
            <Route path="/communication" element={<StubPage title="Kommunikation" />} />
            <Route path="/communication/chat" element={<StubPage title="Chat" />} />
            <Route path="/communication/email" element={<StubPage title="E-Mail" />} />
            <Route path="/finance" element={<StubPage title="Finanzen" />} />
            <Route path="/finance/accounting" element={<StubPage title="Buchhaltung" />} />
            <Route path="/shop" element={<StubPage title="Webshop" />} />
            <Route path="/files" element={<StubPage title="Materialbank" />} />
            <Route path="/settings" element={<StubPage title="Einstellungen" />} />
            <Route path="/settings/roles" element={<StubPage title="Rollen & Berechtigungen" />} />
            <Route path="/settings/fields" element={<StubPage title="Profilfelder" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
