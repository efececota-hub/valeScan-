import { Car, Scan } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-white">
      <div className="z-10 max-w-md w-full flex flex-col items-center gap-8 text-center">
        <div className="bg-blue-600/20 p-4 rounded-2xl border border-blue-500/30">
          <Car className="w-16 h-16 text-blue-500" />
        </div>
        
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-2 italic">ValeScan</h1>
          <p className="text-slate-400 text-lg">
            Sistema de gestión de vales para transporte especial.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-all text-xl shadow-lg shadow-blue-900/20">
            <Scan className="w-6 h-6" />
            Escanear Vale
          </button>
          
          <div className="text-xs text-slate-500 uppercase tracking-widest">
            v1.0.0 - Listo para empezar
          </div>
        </div>
      </div>
    </main>
  );
}
