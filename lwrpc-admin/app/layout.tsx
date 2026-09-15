import "./globals.css";
import ViewAsSharedPages from "./components/ViewAsSharedPages";
import BrowserTitle from "./components/BrowserTitle";
import { AppDialogProvider } from "./components/AppDialogProvider";
import InactivitySessionTimeout from "./components/InactivitySessionTimeout";
import LmsPwaRegister from "./components/LmsPwaRegister";
import SystemFooter from "./components/SystemFooter";
import { headers } from "next/headers";
import { viewAsOrigins } from "./lib/viewAsBoundary";

export const metadata = {
  title: "LWR PC League Management",
  description: "Lakewood Ranch Pickleball Club League Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const origins = viewAsOrigins();
  const isolated = origins && requestHeaders.get('host') === new URL(origins.view).host;
  return (
    <html
      lang="en"
      data-lms-view-as={isolated ? "true" : undefined}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {isolated ? <AppDialogProvider><ViewAsSharedPages>{children}</ViewAsSharedPages></AppDialogProvider> : <><BrowserTitle />
        <LmsPwaRegister />
        <AppDialogProvider>{children}</AppDialogProvider>
        <InactivitySessionTimeout />
        <SystemFooter /></>}
      </body>
    </html>
  );
}
