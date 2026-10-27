import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { AuthLayout, MainLayout, SecureLayout } from '../layout/Layouts';
import { LoginPage, RegisterPage } from '../../feature/auth';
import { HomePage } from '../../feature/home';
import DashboardPage from '@/feature/dashboard/pages/DashboardPage';
import OverviewPage from '@/feature/dashboard/pages/AdminPages/OverviewPage'
import KnowledgePage from '@/feature/dashboard/pages/AdminPages/KnowledgePage';
import AssessmentPage from '@/feature/dashboard/pages/AdminPages/AssessmentPage';
import CandidatesPage from '@/feature/dashboard/pages/AdminPages/CandidatesPage';
import SettingsPage from '@/feature/dashboard/pages/AdminPages/SettingsPage';

import AssessmentPlayer from '@/feature/dashboard/pages/candidatePages/AssessmentPlayer';
import AssessmentResult from '@/feature/dashboard/pages/candidatePages/AssessmentResult';

import UnauthorizedPage from '@/common/pages/UnauthorizedPage';
import HealthPingPage from '@/common/pages/HealthPingPage';
import RoleRedirect from './RoleRedirect';
import ViewAssessmentPage from '@/feature/dashboard/pages/AdminPages/ViewAssessmentPage';
import AssessmentResultPage from '@/feature/dashboard/pages/AdminPages/AssessmentResultPage';

export const AppRouter = () => {
  return (
    <Routes>

      {/* PUBLIC ROUTES (Only accessible if NOT logged in) */}
      <Route element={<PublicRoute />}>
        <Route path='/' element={<HomePage />} />
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/register/join" element={<RegisterPage />} />
        </Route>
      </Route>

     {/* AFTER LOGIN → REDIRECT BASED ON ROLE */}
      <Route path="/dashboard" element={<RoleRedirect />} />

      {/* ADMIN */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/overview" element={<OverviewPage />} />
          <Route path="/admin/knowledge" element={<KnowledgePage />} />
          <Route path="/admin/assessments" element={<AssessmentPage />} />
          <Route path="/admin/candidates" element={<CandidatesPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/assessments/view/:id" element={<ViewAssessmentPage />} />
          <Route path="/admin/assessments/view/:id/result" element={<AssessmentResultPage />} /> 
        </Route>
      </Route>

      {/* MANAGER */}
      <Route element={<ProtectedRoute allowedRoles={["MANAGER"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/manager" element={<DashboardPage />} />
        </Route>
      </Route>

      {/* STAFF */}
      <Route element={<ProtectedRoute allowedRoles={["STAFF"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/staff" element={<DashboardPage />} />
        </Route>
      </Route>

      {/* CANDIDATE (Standard Layout) */}
      <Route element={<ProtectedRoute allowedRoles={["CANDIDATE"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/candidate" element={<DashboardPage />} />
          <Route path="/candidate/assessment/:assignmentId/result" element={<AssessmentResult />} />
          <Route path="/assessment/result/:assignmentId" element={<AssessmentResult />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["CANDIDATE"]} />}>
        <Route element={<SecureLayout />}>
          {/* PLAYER MOVED HERE: Strips away sidebars/navbars for the test */}
          <Route path="/assessment/:id" element={<AssessmentPlayer />} />
        </Route>
      </Route>

      {/* HEALTH CHECK (Public for cron jobs & monitors) */}
      <Route path="/health/ping" element={<HealthPingPage />} />

      {/* CATCH ALL / UNAUTHORIZED */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
};