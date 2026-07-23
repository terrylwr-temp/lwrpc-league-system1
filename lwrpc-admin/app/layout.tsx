import "./globals.css";
import BrowserTitle from "./components/BrowserTitle";
import { AppDialogProvider } from "./components/AppDialogProvider";
import LmsPwaRegister from "./components/LmsPwaRegister";
import SystemFooter from "./components/SystemFooter";

export const metadata = {
  title: "LWR PC League Management",
  description: "Lakewood Ranch Pickleball Club League Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <BrowserTitle />
        <LmsPwaRegister />
        <AppDialogProvider>{children}</AppDialogProvider>
        <SystemFooter />
      </body>
    </html>
  );
}
