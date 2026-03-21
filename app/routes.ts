import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  // Auth catch-all for better-auth
  route('api/auth/*', 'routes/api.auth.$.tsx'),

  // Index redirect
  index('routes/_index.tsx'),

  // Auth layout (login, register, forgot-password)
  layout('routes/_auth.tsx', [
    route('login', 'routes/_auth.login.tsx'),
    route('register', 'routes/_auth.register.tsx'),
    route('forgot-password', 'routes/_auth.forgot-password.tsx'),
  ]),

  // App layout (authenticated)
  layout('routes/_app.tsx', [
    route('dashboard', 'routes/_app.dashboard.tsx'),

    // Members
    route('members', 'routes/_app.members.tsx'),
    route('members/new', 'routes/_app.members.new.tsx'),
    route('members/:id', 'routes/_app.members.$id.tsx'),

    // Courses
    route('courses', 'routes/_app.courses.tsx'),
    route('courses/new', 'routes/_app.courses.new.tsx'),
    route('courses/:id', 'routes/_app.courses.$id.tsx'),

    // Events
    route('events', 'routes/_app.events.tsx'),
    route('events/:id', 'routes/_app.events.$id.tsx'),

    // Attendance
    route('attendance', 'routes/_app.attendance.tsx'),

    // Communication
    route('communication', 'routes/_app.communication.tsx'),

    // Contracts
    route('contracts', 'routes/_app.contracts.tsx'),
    route('contracts/new', 'routes/_app.contracts.new.tsx'),
    route('contracts/settings', 'routes/_app.contracts.settings.tsx'),
    route('contracts/:id', 'routes/_app.contracts.$id.tsx'),

    // Billing & Applications
    route('billing', 'routes/_app.billing.tsx'),
    route('applications', 'routes/_app.applications.tsx'),

    // Families
    route('families', 'routes/_app.families.tsx'),
    route('families/:id', 'routes/_app.families.$id.tsx'),

    // Groups
    route('groups', 'routes/_app.groups.tsx'),
    route('groups/:id', 'routes/_app.groups.$id.tsx'),

    // Finance, Shop, Files, Settings
    route('finance', 'routes/_app.finance.tsx'),
    route('shop', 'routes/_app.shop.tsx'),
    route('files', 'routes/_app.files.tsx'),
    route('settings', 'routes/_app.settings.tsx'),

    // Member Portal
    route('portal', 'routes/_app.portal.tsx'),
    route('portal/profile', 'routes/_app.portal.profile.tsx'),
    route('portal/courses', 'routes/_app.portal.courses.tsx'),
    route('portal/attendance', 'routes/_app.portal.attendance.tsx'),
  ]),
] satisfies RouteConfig;
