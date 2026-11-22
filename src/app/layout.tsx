import type { Metadata } from "next";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { FirebaseErrorListener } from "@/components/firebase-error-listener";

export const metadata: Metadata = {
  title: "ValeScan - Transnova Plus",
  description: "Gestión eficiente de vales de transporte para conductores",
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
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}