import "./globals.css";
import Script from "next/script";

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
      <Script
        id="remove-extension-form-attributes"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (() => {
              const stripInjectedAttributes = () => {
                document
                  .querySelectorAll("[fdprocessedid]")
                  .forEach((node) => node.removeAttribute("fdprocessedid"));
              };

              stripInjectedAttributes();

              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "fdprocessedid"
                  ) {
                    mutation.target.removeAttribute("fdprocessedid");
                  }
                });
              });

              observer.observe(document.documentElement, {
                subtree: true,
                attributes: true,
                attributeFilter: ["fdprocessedid"],
              });

              window.addEventListener(
                "load",
                () => window.setTimeout(() => observer.disconnect(), 3000),
                { once: true }
              );
            })();
          `,
        }}
      />
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
