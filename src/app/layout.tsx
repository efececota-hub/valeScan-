import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { FirebaseErrorListener } from "@/components/firebase-error-listener";
import { PWARegistration } from "@/components/pwa-registration";

export const metadata: Metadata = {
  title: "ValeScan - Transnova Plus",
  description: "Gestión eficiente de vales de transporte para conductores",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ValeScan",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-950 text-slate-50">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          <PWARegistration />
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}