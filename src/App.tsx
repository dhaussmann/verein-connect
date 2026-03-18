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
import Attendance from "@/pages/Attendance";
import AttendanceCheckIn from "@/pages/AttendanceCheckIn";
import Communication from "@/pages/Communication";
import Finance from "@/pages/Finance";
import Shop from "@/pages/Shop";
import Files from "@/pages/Files";
import Settings from "@/pages/Settings";
import StubPage from "@/pages/StubPage";
import NotFound from "@/pages/NotFound";
import MemberDashboard from "@/pages/portal/MemberDashboard";
import MyProfile from "@/pages/portal/MyProfile";
import MyCourses from "@/pages/portal/MyCourses";
import MyEvents from "@/pages/portal/MyEvents";
import { RoleRedirect } from "@/components/layout/RoleRedirect";
import Contracts from "@/pages/Contracts";
import ContractDetail from "@/pages/ContractDetail";
import ContractNew from "@/pages/ContractNew";
import ContractSettingsPage from "@/pages/ContractSettingsPage";
import ContractApplications from "@/pages/ContractApplications";
import Groups from "@/pages/Groups";
import GroupDetail from "@/pages/GroupDetail";
import ContractBilling from "@/pages/ContractBilling";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/new" element={<MemberNew />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/new" element={<CourseNew />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/new" element={<CourseNew />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/:eventId" element={<AttendanceCheckIn />} />
            <Route path="/communication" element={<Communication />} />
            <Route path="/communication/chat" element={<Communication />} />
            <Route path="/communication/email" element={<Communication />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contracts/new" element={<ContractNew />} />
            <Route path="/contracts/settings" element={<ContractSettingsPage />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/billing" element={<ContractBilling />} />
            <Route path="/applications" element={<ContractApplications />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/finance/accounting" element={<Finance />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/files" element={<Files />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/roles" element={<Settings />} />
            <Route path="/settings/fields" element={<Settings />} />
            <Route path="/portal" element={<MemberDashboard />} />
            <Route path="/portal/profile" element={<MyProfile />} />
            <Route path="/portal/courses" element={<MyCourses />} />
            <Route path="/portal/attendance" element={<MyEvents />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
