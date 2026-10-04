import type { ReactNode } from "react";
import { AffiliateNotificationProvider } from "./notification-context";

export default function AffiliateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AffiliateNotificationProvider>
      {children}
    </AffiliateNotificationProvider>
  );
}
