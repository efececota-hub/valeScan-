
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, Settings, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { extractVoucher, ExtractVoucherOutput } from '@/ai/flows/extract-voucher-flow';

const DEFAULT_ENTRY_IDS = {
  numero_vale: 'entry.1',
  cliente: 'entry.2',
  fecha: 'entry.3',
  hora_inicio: 'entry.4',
  hora_final: 'entry.5',
  solicitante: 'entry.6',
  centro_costos: 'entry.7',
  origen: 'entry.8',
  destino: 'entry.9',
  placa: 'entry.10',
  conductor: 'entry.11',
  usuarios: 'entry.12',
  valor: 'entry.13',
  observaciones: 'entry.14',
};

const DEFAULT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfD_L6p_8B_q-7fVvR5-7W6_1Z_l_v_S_l_v_S_l_v_S_l_v_S/formResponse';

type Step = 'scan' | 'review' | 'success';

export default function ValeScanApp() {
  const [step, setStep] = useState<Step>('scan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [formUrl, setFormUrl] = useState(DEFAULT_FORM_URL);
  const [entryIds, setEntryIds] = useState(DEFAULT_ENTRY_IDS);
  const [voucherData, setVoucherData] = useState<ExtractVoucherOutput>({
    numero_vale: '',
    cliente: '',
    fecha: '',
    hora_inicio: '',
    hora_final: '',
    solicitante: '',
    centro_costos: '',
    origen: '',
    destino: '',
    placa: '',
    conductor: '',
    usuarios: '',
    valor: '',
    observaciones: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedIds = localStorage.getItem('valescan_v2_entry_ids');
    const savedUrl = localStorage.getItem('valescan_v2_form_url');
    if (savedIds) setEntryIds(JSON.parse(savedIds));
    if (savedUrl) setFormUrl(savedUrl);
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('valescan_v2_entry_ids', JSON.stringify(entryIds));
    localStorage.setItem('valescan_v2_form_url', formUrl);
    setShowConfig(false);
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const result = await extractVoucher(base64);
          setVoucherData(result);
          setStep('review');
        } catch (err) {
          setError('No se pudo leer el vale. Asegúrate de que la foto sea clara y el número rojo sea visible.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error al procesar la imagen.');
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new URLSearchParams();
    Object.keys(voucherData).forEach((key) => {
      const entryId = entryIds[key as keyof typeof entryIds];
      const value = voucherData[key as keyof typeof voucherData];
      formData.append(entryId, value);
    });

    try {
      await fetch(formUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      setStep('success');
    } catch (err) {
      setError('Error al enviar al formulario. Revisa la URL en configuración.');
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setStep('scan');
    setError(null);
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-50 p-4 md:p-6 max-w-xl mx-auto flex flex-col gap-4">
      <header className="flex items-center justify-between py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">ValeScan <span className="text-blue-500 font-normal">PLUS</span></h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)} className="text-slate-400">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {showConfig && (
        <Card className="bg-slate-900 border-slate-800 animate-in slide-in-from-top-2">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-bold text-blue-400 uppercase tracking-wider">Mapeo de Google Form</CardTitle>
            <CardDescription className="text-[10px]">Ingresa los entry.ID correspondientes a cada campo.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase">URL formResponse</Label>
              <Input
                className="bg-slate-950 border-slate-800 text-xs h-8"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.keys(entryIds).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[9px] text-slate-500 uppercase">{key.replace('_', ' ')}</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 text-[10px] h-7"
                    value={entryIds[key as keyof typeof entryIds]}
                    onChange={(e) => setEntryIds({ ...entryIds, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-xs font-bold uppercase">Guardar Configuración</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex-1">
        {step === 'scan' && (
          <div className="h-full flex flex-col justify-center gap-6 py-8 animate-in fade-in zoom-in-95 duration-300">
            <div 
              className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center p-6 text-center gap-4 hover:border-blue-500/50 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-200">Escanear Vale Físico</h3>
                <p className="text-sm text-slate-500">Toma una foto del vale de Transnova Plus</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
            <Button 
              variant="outline" 
              className="w-full border-slate-800 text-slate-400 h-14 rounded-xl text-base"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5 mr-3" />
              Seleccionar de Galería
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 animate-pulse">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-blue-500 font-bold tracking-widest text-sm uppercase">Procesando vale con IA...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex flex-col gap-4 text-red-500 mb-6 animate-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
            <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 h-11" onClick={resetApp}>
              Volver a intentar
            </Button>
          </div>
        )}

        {step === 'review' && !loading && (
          <Card className="bg-slate-900 border-slate-800 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <CardHeader className="border-b border-slate-800/50 pb-4 bg-slate-900/50 sticky top-0 z-10 rounded-t-lg">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-black text-white italic">REVISIÓN DE ENCUESTA</CardTitle>
                <div className="bg-red-600 text-white text-xs px-2 py-1 rounded font-mono font-bold">
                  Nº {voucherData.numero_vale}
                </div>
              </div>
              <CardDescription className="text-slate-400 text-xs">Verifica que los datos coincidan con el vale físico.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {/* Fila 1: Cliente y Fecha */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-500 uppercase font-bold tracking-wider">Cliente</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm focus:border-blue-500"
                        value={voucherData.cliente}
                        onChange={(e) => setVoucherData({ ...voucherData, cliente: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-500 uppercase font-bold tracking-wider">Fecha</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.fecha}
                        onChange={(e) => setVoucherData({ ...voucherData, fecha: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Fila 2: Solicitante y Centro Costos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Solicitante</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.solicitante}
                        onChange={(e) => setVoucherData({ ...voucherData, solicitante: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Centro Costos</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.centro_costos}
                        onChange={(e) => setVoucherData({ ...voucherData, centro_costos: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Fila 3: Horas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Hora Inicio</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.hora_inicio}
                        onChange={(e) => setVoucherData({ ...voucherData, hora_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Hora Final</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.hora_final}
                        onChange={(e) => setVoucherData({ ...voucherData, hora_final: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Fila 4: Origen y Destino */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Origen (Desde)</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.origen}
                        onChange={(e) => setVoucherData({ ...voucherData, origen: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Destino (Hasta)</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.destino}
                        onChange={(e) => setVoucherData({ ...voucherData, destino: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Fila 5: Placa y Conductor */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Placa</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm uppercase"
                        value={voucherData.placa}
                        onChange={(e) => setVoucherData({ ...voucherData, placa: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Conductor</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.conductor}
                        onChange={(e) => setVoucherData({ ...voucherData, conductor: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Fila 6: Usuarios (Pasajeros) */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-blue-400 uppercase font-bold">Usuarios / Identificación</Label>
                    <Textarea
                      className="bg-slate-950 border-slate-800 text-sm min-h-[60px]"
                      value={voucherData.usuarios}
                      onChange={(e) => setVoucherData({ ...voucherData, usuarios: e.target.value })}
                    />
                  </div>

                  {/* Fila 7: Valor y Observaciones */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1.5">
                      <Label className="text-[10px] text-green-500 uppercase font-bold">Valor $</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm font-bold text-green-500"
                        value={voucherData.valor}
                        onChange={(e) => setVoucherData({ ...voucherData, valor: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-bold">Observaciones</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.observaciones}
                        onChange={(e) => setVoucherData({ ...voucherData, observaciones: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4 sticky bottom-4 bg-slate-900 py-2 border-t border-slate-800">
                  <Button type="button" variant="ghost" className="flex-1 text-slate-400 h-12" onClick={resetApp}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 h-14 text-lg font-black italic shadow-lg shadow-blue-900/20">
                    <Send className="w-5 h-5 mr-3" />
                    ENVIAR ENCUESTA
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center text-center gap-8 py-16 animate-in zoom-in-95 duration-500">
            <div className="relative">
              <div className="w-32 h-32 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 animate-bounce">
                <CheckCircle2 className="w-20 h-20" />
              </div>
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                EXITOSO
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black italic text-white">¡VALE REGISTRADO!</h2>
              <p className="text-slate-400 max-w-[280px] mx-auto text-sm">La información del vale #{voucherData.numero_vale} ha sido enviada correctamente al sistema.</p>
            </div>
            <Button onClick={resetApp} size="lg" className="bg-white text-slate-950 hover:bg-slate-200 w-full rounded-2xl h-16 text-xl font-black italic">
              <RefreshCcw className="w-6 h-6 mr-3" />
              NUEVO ESCANEO
            </Button>
          </div>
        )}
      </div>

      <footer className="mt-auto py-4 text-center border-t border-slate-900">
        <p className="text-[10px] text-slate-700 font-mono tracking-widest uppercase">Transnova Plus System v4.0.0 // IDX-STABILIZED</p>
      </footer>
    </main>
  );
}
