/* eslint-disable react-refresh/only-export-components */
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { getSessionTokens, getEnv } from "@/lib/session.server";
import appCss from "./app.css?url";
import type { AuthUser } from "@/lib/auth.server";

export const links = () => [{ rel: "stylesheet", href: appCss }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const { user } = await getSessionTokens(request, env.COOKIE_SECRET);
  return { user: (user as AuthUser | null) ?? null };
}

export type RootLoaderData = Awaited<ReturnType<typeof loader>>;

const mantineTheme = createTheme({
  fontFamily: "Inter, system-ui, sans-serif",
  primaryColor: "blue",
  primaryShade: 7,
  colors: {
    // Custom primary blue matching the current design (hsl 207 62% 28%)
    vcBlue: [
      "#e8f0f8",
      "#cddaee",
      "#a4bfde",
      "#7aa3cd",
      "#578bbf",
      "#407db4",
      "#3275ae",
      "#265e8f", // primary (hsl 207 62% 28%)
      "#1f4e77",
      "#163d5e",
    ],
  },
  defaultRadius: "sm",
  components: {
    Button: {
      defaultProps: {
        radius: "sm",
      },
    },
    Input: {
      defaultProps: {
        radius: "sm",
      },
    },
    Select: {
      defaultProps: {
        radius: "sm",
      },
    },
    Modal: {
      defaultProps: {
        radius: "sm",
      },
    },
    Card: {
      defaultProps: {
        radius: "sm",
        withBorder: true,
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <MantineProvider theme={mantineTheme}>
      <Notifications position="top-right" />
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Fehler – Verein Connect</title>
      </head>
      <body>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          <p>Ein unerwarteter Fehler ist aufgetreten.</p>
        </div>
      </body>
    </html>
  );
}
