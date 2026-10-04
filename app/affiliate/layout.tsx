import type { ReactNode } from "react";
import { AffiliateNotificationProvider } from "./notification-context";
import { AffiliateThemeProvider } from "./theme-context";

export default function AffiliateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AffiliateThemeProvider>
      <AffiliateNotificationProvider>
        {children}
      </AffiliateNotificationProvider>
    </AffiliateThemeProvider>
  );
}
