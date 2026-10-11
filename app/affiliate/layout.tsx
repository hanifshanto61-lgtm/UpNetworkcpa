
import type { ReactNode } from "react";
import { AffiliateNotificationProvider } from "./notification-context";
import { AffiliateThemeProvider } from "./theme-context";
import AffiliateAccessGate from "./access-gate";

export default function AffiliateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AffiliateThemeProvider>
      <AffiliateNotificationProvider>
        <AffiliateAccessGate>
          <div className="relative min-h-screen isolate">
            {/* Shared colorful background */}
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
            >
              {/* Dark background */}
              <div className="absolute inset-0 bg-[#080b29] affiliate-light:hidden" />

              {/* Light background */}
              <div className="absolute inset-0 hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 affiliate-light:block" />

              {/* Colorful gradient layers */}
              <div className="absolute -top-40 left-[-15%] h-[650px] w-[650px] rounded-full bg-blue-600/35 blur-[110px]" />

              <div className="absolute top-[15%] right-[-15%] h-[600px] w-[600px] rounded-full bg-purple-600/35 blur-[110px]" />

              <div className="absolute top-[55%] left-[-15%] h-[550px] w-[550px] rounded-full bg-fuchsia-600/25 blur-[110px]" />

              <div className="absolute bottom-[-15%] right-[-10%] h-[550px] w-[550px] rounded-full bg-cyan-500/25 blur-[110px]" />

              {/* Decorative glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-purple-950/30 affiliate-light:opacity-20" />
            </div>

            {/* Existing affiliate pages */}
            <div className="relative z-10 min-h-screen">
              {children}
            </div>
          </div>
        </AffiliateAccessGate>
      </AffiliateNotificationProvider>
    </AffiliateThemeProvider>
  );
}
