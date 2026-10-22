"use client";

import type { ReactNode } from "react";
import { AffiliateNotificationProvider } from "./notification-context";
import { AffiliateThemeProvider, useAffiliateTheme } from "./theme-context";
import AffiliateAccessGate from "./access-gate";

function ColorfulAffiliateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { theme } = useAffiliateTheme();
  const dark = theme === "dark";

  return (
    <div className="relative isolate min-h-screen">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
        style={{
          background: dark
            ? "linear-gradient(125deg, #060b2e 0%, #10115b 35%, #321078 70%, #080e38 100%)"
            : "linear-gradient(125deg, #e0efff 0%, #e8dcff 45%, #ffe1f4 100%)",
        }}
      >
        <div className="absolute -left-40 -top-32 h-[650px] w-[650px] rounded-full bg-blue-500/40 blur-[100px]" />

        <div className="absolute -right-32 top-[5%] h-[600px] w-[600px] rounded-full bg-fuchsia-500/40 blur-[110px]" />

        <div className="absolute left-[15%] top-[45%] h-[650px] w-[650px] rounded-full bg-violet-500/30 blur-[120px]" />

        <div className="absolute -bottom-40 right-[5%] h-[600px] w-[600px] rounded-full bg-cyan-500/30 blur-[110px]" />

        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/5 to-blue-500/10" />
      </div>

      <div className="relative z-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}

export default function AffiliateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AffiliateThemeProvider>
      <AffiliateNotificationProvider>
        <AffiliateAccessGate>
          <ColorfulAffiliateLayout>
            {children}
          </ColorfulAffiliateLayout>
        </AffiliateAccessGate>
      </AffiliateNotificationProvider>
    </AffiliateThemeProvider>
  );
}