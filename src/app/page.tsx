'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, Settings, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCcw, FileText, ChevronRight } from 'lucide-react';
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
    const savedIds = localStorage.getItem('valescan_v3_entry_ids');
    const savedUrl = localStorage.getItem('valescan_v3_form_url');
    if (savedIds) setEntryIds(JSON.parse(savedIds));
    if (savedUrl) setFormUrl(savedUrl);
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('valescan_v3_entry_ids', JSON.stringify(entryIds));
    localStorage.setItem('valescan_v3_form_url', formUrl);
    setShowConfig(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const result = await extractVoucher(base64);
          setVoucherData(result);
          setStep('review');
        } catch (err: any) {
          setError(err.message || 'No se pudo leer el vale. Verifica que la imagen sea nítida.');
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Error al leer el archivo del dispositivo.');
        setLoading(false);
      };
    } catch (err) {
      setError('Ocurrió un error inesperado al procesar la foto.');
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
      setError('Error de conexión al enviar al formulario.');
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setStep('scan');
    setError(null);
    setVoucherData({
      numero_vale: '', cliente: '', fecha: '', hora_inicio: '', hora_final: '',
      solicitante: '', centro_costos: '', origen: '', destino: '', placa: '',
      conductor: '', usuarios: '', valor: '', observaciones: '',
    });
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="px-4 py-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">VALESCAN</h1>
            <p className="text-[10px] text-blue-500 font-bold tracking-[0.2em] mt-0.5">TRANSNOVA PLUS</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)} className="text-slate-400 hover:text-white hover:bg-slate-800">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 p-4 max-w-xl mx-auto w-full">
        {showConfig && (
          <Card className="bg-slate-900 border-slate-800 mb-4 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="p-4 border-b border-slate-800 bg-slate-800/30">
              <CardTitle className="text-xs font-bold text-blue-400 uppercase tracking-widest">Configuración de Campos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500 uppercase font-bold">Google Form Response URL</Label>
                <Input
                  className="bg-slate-950 border-slate-800 text-xs h-9 focus:ring-blue-500"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(entryIds).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[9px] text-slate-500 uppercase">{key.replace('_', ' ')}</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 text-[10px] h-8"
                      value={entryIds[key as keyof typeof entryIds]}
                      onChange={(e) => setEntryIds({ ...entryIds, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase text-xs h-10 shadow-lg shadow-blue-900/30">
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'scan' && !loading && (
          <div className="space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4">
            <div 
              className="group relative aspect-[3/4] rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center p-8 text-center gap-6 cursor-pointer hover:border-blue-500/50 hover:bg-slate-900/50 transition-all duration-500"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-500 ring-8 ring-blue-600/5">
                <Camera className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white italic">ESCANEAR VALE</h3>
                <p className="text-sm text-slate-400 font-medium">Captura el vale físico para extraer los datos automáticamente.</p>
              </div>
              <div className="absolute bottom-8 text-blue-500 font-bold text-[10px] tracking-widest flex items-center gap-2">
                SISTEMA DE IA ACTIVO <ChevronRight className="w-3 h-3" />
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
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 border-slate-800 bg-slate-900/50 text-slate-300 h-14 rounded-2xl hover:bg-slate-800"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 mr-3" />
                Galería
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-blue-500 font-black tracking-[0.3em] text-xs uppercase animate-pulse">Procesando vale</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Gemini IA está leyendo el documento...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex flex-col gap-5 animate-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="bg-red-500/20 p-2 rounded-lg text-red-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-red-500 uppercase text-xs tracking-wider">Error de Escaneo</h4>
                <p className="text-sm text-red-200/80 leading-relaxed">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/20 h-12 rounded-xl font-bold uppercase text-xs" onClick={resetApp}>
              Intentar de Nuevo
            </Button>
          </div>
        )}

        {step === 'review' && !loading && (
          <Card className="bg-slate-900 border-slate-800 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-500">
            <CardHeader className="border-b border-slate-800/50 bg-slate-950/30 p-5 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-black italic tracking-tighter text-white">REVISAR DATOS</CardTitle>
                  <CardDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Confirma antes de enviar</CardDescription>
                </div>
                <div className="bg-red-600 px-3 py-1.5 rounded-lg text-white font-mono font-bold shadow-lg shadow-red-900/20 border border-red-500/50">
                  #{voucherData.numero_vale}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-blue-500 uppercase font-black tracking-widest">Cliente</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm focus:border-blue-500 rounded-xl"
                        value={voucherData.cliente}
                        onChange={(e) => setVoucherData({ ...voucherData, cliente: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-blue-500 uppercase font-black tracking-widest">Fecha</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm rounded-xl"
                        value={voucherData.fecha}
                        onChange={(e) => setVoucherData({ ...voucherData, fecha: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Solicitante</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm rounded-xl"
                        value={voucherData.solicitante}
                        onChange={(e) => setVoucherData({ ...voucherData, solicitante: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Centro de Costos</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm rounded-xl"
                        value={voucherData.centro_costos}
                        onChange={(e) => setVoucherData({ ...voucherData, centro_costos: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Origen</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm rounded-xl"
                        value={voucherData.origen}
                        onChange={(e) => setVoucherData({ ...voucherData, origen: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Destino</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm rounded-xl"
                        value={voucherData.destino}
                        onChange={(e) => setVoucherData({ ...voucherData, destino: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Placa Vehículo</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm uppercase rounded-xl font-bold"
                        value={voucherData.placa}
                        onChange={(e) => setVoucherData({ ...voucherData, placa: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Conductor</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm rounded-xl"
                        value={voucherData.conductor}
                        onChange={(e) => setVoucherData({ ...voucherData, conductor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Pasajeros (Nombre y Cédula)</Label>
                    <Textarea
                      className="bg-slate-950 border-slate-800 text-sm min-h-[80px] rounded-xl"
                      value={voucherData.usuarios}
                      onChange={(e) => setVoucherData({ ...voucherData, usuarios: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-2">
                      <Label className="text-[10px] text-green-500 uppercase font-black tracking-widest">Valor $</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm font-black text-green-500 rounded-xl"
                        value={voucherData.valor}
                        onChange={(e) => setVoucherData({ ...voucherData, valor: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Observaciones</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-11 text-sm rounded-xl"
                        value={voucherData.observaciones}
                        onChange={(e) => setVoucherData({ ...voucherData, observaciones: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <Button type="button" variant="ghost" className="flex-1 text-slate-500 font-bold uppercase text-xs h-14 rounded-2xl" onClick={resetApp}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl text-lg font-black italic shadow-xl shadow-blue-900/40">
                    <Send className="w-5 h-5 mr-3" />
                    ENVIAR REPORTE
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center text-center gap-10 py-20 animate-in zoom-in-95 duration-700">
            <div className="relative">
              <div className="w-40 h-40 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 ring-[12px] ring-green-500/5 animate-pulse">
                <CheckCircle2 className="w-24 h-24" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-slate-950 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tighter">
                Completado
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-black italic text-white tracking-tighter">¡VALE ENVIADO!</h2>
              <p className="text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                Los datos del vale <span className="text-white font-bold">#{voucherData.numero_vale}</span> han sido registrados correctamente en el sistema.
              </p>
            </div>
            <Button onClick={resetApp} size="lg" className="bg-white text-slate-950 hover:bg-slate-200 w-full rounded-2xl h-16 text-xl font-black italic shadow-2xl">
              <RefreshCcw className="w-6 h-6 mr-3" />
              NUEVO ESCANEO
            </Button>
          </div>
        )}
      </div>

      <footer className="py-6 text-center border-t border-slate-900/50 bg-slate-950/20">
        <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em] uppercase">Transnova Plus // ValeScan v4.1.0</p>
      </footer>
    </main>
  );
}
