import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // Root redirect
  index("routes/index.tsx"),

  // Auth routes (no layout)
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("forgot-password", "routes/auth/forgot-password.tsx"),
  route("logout", "routes/auth/logout.tsx"),
  route("system/run-cron", "routes/system/run-cron.ts"),

  // Protected layout routes
  layout("routes/_layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),

    // Members
    route("members", "routes/members/index.tsx"),
    route("members/new", "routes/members/new.tsx"),
    route("members/:id", "routes/members/$id.tsx"),

    // Courses
    route("courses", "routes/courses/index.tsx"),
    route("courses/new", "routes/courses/new.tsx"),
    route("courses/:id", "routes/courses/$id.tsx"),

    // Events
    route("events", "routes/events/index.tsx"),
    route("events/new", "routes/events/new.tsx"),
    route("events/:id", "routes/events/$id.tsx"),

    // Attendance
    route("attendance", "routes/attendance/index.tsx"),
    route("attendance/:eventId", "routes/attendance/$eventId.tsx"),

    // Communication
    route("communication", "routes/communication/index.tsx"),
    route("communication/email", "routes/communication/email.tsx"),

    // Contracts
    route("contracts", "routes/contracts/index.tsx"),
    route("contracts/new", "routes/contracts/new.tsx"),
    route("contracts/settings", "routes/contracts/settings.tsx"),
    route("contracts/:id", "routes/contracts/$id.tsx"),

    // Contract-related
    route("billing", "routes/billing/index.tsx"),
    route("applications", "routes/applications/index.tsx"),

    // Groups
    route("groups", "routes/groups/index.tsx"),
    route("groups/:id", "routes/groups/$id.tsx"),

    // Finance
    route("finance", "routes/finance/index.tsx"),
    route("finance/accounting", "routes/finance/accounting.tsx"),

    // Other
    route("settings", "routes/settings/layout.tsx", [
      index("routes/settings/index.tsx"),
      route("users", "routes/settings/users.tsx"),
      route("roles", "routes/settings/roles.tsx"),
      route("fields", "routes/settings/fields.tsx"),
      route("notifications", "routes/settings/notifications.tsx"),
      route("integrations", "routes/settings/integrations.tsx"),
      route("gdpr", "routes/settings/gdpr.tsx"),
      route("membership-levels", "routes/settings/membership-levels.tsx"),
    ]),

    // Member portal
    route("portal", "routes/portal/index.tsx"),
    route("portal/profile", "routes/portal/profile.tsx"),
    route("portal/courses", "routes/portal/courses.tsx"),
    route("portal/attendance", "routes/portal/attendance.tsx"),
  ]),
] satisfies RouteConfig;
