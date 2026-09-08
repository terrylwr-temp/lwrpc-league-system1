import "./globals.css";
import ViewAsPage from "./view-as/page";
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
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {isolated ? <ViewAsPage /> : <><BrowserTitle />
        <LmsPwaRegister />
        <AppDialogProvider>{children}</AppDialogProvider>
        <InactivitySessionTimeout />
        <SystemFooter /></>}
      </body>
    </html>
  );
}
