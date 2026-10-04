import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";

import i18n from "../i18n";
import appCss from "../styles.css?url";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { Navbar, Footer } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground font-display">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold">
          {t("notFound.title")}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {t("notFound.desc")}
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  console.error(error);

  useEffect(() => {
    reportLovableError(
      error instanceof Error ? error : new Error(String(error)),
      {
        boundary: "tanstack_root_error_component",
      }
    );
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("error.title")}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {t("error.desc")}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("error.retry")}
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {t("error.home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<{ queryClient: QueryClient }>()({
    head: () => {
      const siteUrl =
        typeof window !== "undefined"
          ? import.meta.env?.VITE_SITE_URL || window.location.origin
          : import.meta.env?.VITE_SITE_URL || "https://batirtchad.org";

      return {
        meta: [
          {
            charSet: "utf-8",
          },

          {
            name: "viewport",
            content: "width=device-width, initial-scale=1",
          },

          {
            title:
              "BATIR TCHAD – Plateforme citoyenne pour améliorer les infrastructures au Tchad",
          },

          {
            name: "description",
            content:
              "BATIR TCHAD est une plateforme citoyenne permettant de signaler les infrastructures dégradées au Tchad (routes, ponts, écoles, santé, eau) et de suivre leur traitement.",
          },

          {
            property: "og:site_name",
            content: "BATIR TCHAD",
          },

          {
            property: "og:title",
            content:
              "BATIR TCHAD – Plateforme citoyenne pour améliorer les infrastructures au Tchad",
          },

          {
            property: "og:description",
            content:
              "Signalez les infrastructures publiques dégradées au Tchad et suivez leur résolution par les autorités.",
          },

          {
            property: "og:url",
            content: siteUrl,
          },

          {
            property: "og:type",
            content: "website",
          },

          {
            property: "og:locale",
            content: "fr_TD",
          },

          {
            property: "og:locale:alternate",
            content: "ar_TD",
          },

          {
            property: "og:image",
            content: `${siteUrl}/og-image.png`,
          },

          {
            name: "twitter:card",
            content: "summary_large_image",
          },

          {
            name: "twitter:title",
            content: "BATIR TCHAD – Plateforme citoyenne au Tchad",
          },

          {
            name: "twitter:description",
            content:
              "Signalez les infrastructures publiques dégradées au Tchad. Routes, ponts, écoles, santé, eau — votre voix compte.",
          },

          {
            name: "twitter:image",
            content: `${siteUrl}/og-image.png`,
          },
        ],

        links: [
          {
            rel: "canonical",
            href: siteUrl,
          },

          {
            rel: "stylesheet",
            href: appCss,
          },

          {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
          },

          {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
          },

          {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Sora:wght@400;600;700;800&display=swap",
          },
        ],
      };
    },

    shellComponent: RootShell,

    component: RootComponent,

    notFoundComponent: NotFoundComponent,

    errorComponent: ErrorComponent,
  });

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>

      <body>
        {children}

        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div
            className={
              (i18n.language || "fr").startsWith("ar")
                ? "min-h-screen flex flex-col rtl"
                : "min-h-screen flex flex-col"
            }
          >
            <Navbar />

            <main className="flex-1">
              <Outlet />
            </main>

            <Footer />
          </div>

          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}