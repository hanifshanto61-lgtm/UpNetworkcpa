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
          {children}
        </AffiliateAccessGate>
      </AffiliateNotificationProvider>
    </AffiliateThemeProvider>
  );
}
