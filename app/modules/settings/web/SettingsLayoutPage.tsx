import { NavLink, Outlet, useLocation } from "react-router";
import { Card, Stack, Text } from "@mantine/core";
import { PageHeader } from "@/components/layout/PageHeader";

const settingsNavItems = [
  { to: "/settings", label: "Allgemein" },
  { to: "/settings/users", label: "Benutzer" },
  { to: "/settings/roles", label: "Rollen & Berechtigungen" },
  { to: "/settings/fields", label: "Profilfelder" },
  { to: "/settings/notifications", label: "Benachrichtigungen" },
  { to: "/settings/integrations", label: "Integrationen" },
  { to: "/settings/gdpr", label: "DSGVO & Datenschutz" },
];

export default function SettingsLayoutPage() {
  const location = useLocation();

  return (
    <div>
      <PageHeader title="Einstellungen" />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card padding="md">
          <Stack gap={6}>
            {settingsNavItems.map((item) => {
              const isActive =
                item.to === "/settings"
                  ? location.pathname === "/settings"
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/settings"}
                  className="rounded-md no-underline"
                  style={{
                    padding: "0.65rem 0.75rem",
                    background: isActive ? "var(--mantine-color-blue-0)" : "transparent",
                    color: isActive ? "var(--mantine-color-blue-8)" : "var(--mantine-color-text)",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </Stack>
          <Text size="xs" c="dimmed" mt="md">
            Settings sind jetzt in eigenstaendige Unterseiten aufgeteilt.
          </Text>
        </Card>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
