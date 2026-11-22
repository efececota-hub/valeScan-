'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, Settings, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCcw, FileText, Smartphone, Image as ImageIcon, MapPin, Clock, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { extractVoucher, ExtractVoucherOutput } from '@/ai/flows/extract-voucher-flow';
import { cn } from '@/lib/utils';

const DEFAULT_ENTRY_IDS = {
  numeroVale: 'entry.1',
  cliente: 'entry.2',
  horaInicio: 'entry.3',
  horaFinal: 'entry.4',
  solicitante: 'entry.5',
  centroCostos: 'entry.6',
  fecha: 'entry.7',
  area: 'entry.8',
  origen: 'entry.9',
  destino: 'entry.10',
  placa: 'entry.11',
  usuarioNombre: 'entry.12',
  usuarioIdentificacion: 'entry.13',
  usuarioCargo: 'entry.14',
  conductor: 'entry.15',
  observaciones: 'entry.16',
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [voucherData, setVoucherData] = useState<ExtractVoucherOutput>({
    numeroVale: '', cliente: '', horaInicio: '', horaFinal: '',
    solicitante: '', centroCostos: '', fecha: '', area: '',
    origen: '', destino: '', placa: '', usuarioNombre: '',
    usuarioIdentificacion: '', usuarioCargo: '', conductor: '', observaciones: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedIds = localStorage.getItem('valescan_entry_ids');
    const savedUrl = localStorage.getItem('valescan_form_url');
    if (savedIds) setEntryIds(JSON.parse(savedIds));
    if (savedUrl) setFormUrl(savedUrl);
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('valescan_entry_ids', JSON.stringify(entryIds));
    localStorage.setItem('valescan_form_url', formUrl);
    setShowConfig(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      
      try {
        const result = await extractVoucher(base64);
        setVoucherData(result);
        setStep('review');
      } catch (err: any) {
        setError("La IA no pudo leer los datos automáticamente. Por favor, completa la encuesta manualmente.");
        setStep('review'); // Permitimos corregir manual incluso si falla el OCR
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
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
      formData.append(entryId, value || '');
    });

    try {
      // Intento de envío directo (POST no-cors para Google Forms)
      await fetch(formUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      setStep('success');
    } catch (err) {
      // Fallback: abrir enlace prellenado si el POST falla
      const params = new URLSearchParams();
      Object.keys(voucherData).forEach((key) => {
        const entryId = entryIds[key as keyof typeof entryIds];
        const value = voucherData[key as keyof typeof voucherData];
        params.append(entryId, value || '');
      });
      window.open(`${formUrl.replace('/formResponse', '/viewform')}?${params.toString()}`, '_blank');
      setStep('success');
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setStep('scan');
    setError(null);
    setPreviewUrl(null);
    setVoucherData({
      numeroVale: '', cliente: '', horaInicio: '', horaFinal: '',
      solicitante: '', centroCostos: '', fecha: '', area: '',
      origen: '', destino: '', placa: '', usuarioNombre: '',
      usuarioIdentificacion: '', usuarioCargo: '', conductor: '', observaciones: '',
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col antialiased">
      {/* Header Fijo */}
      <header className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none uppercase italic">ValeScan</h1>
            <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">Transporte Especial</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)} className="text-slate-400 hover:text-white hover:bg-slate-800">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {/* Panel de Configuración */}
        {showConfig && (
          <Card className="bg-slate-900 border-slate-800 mb-6 overflow-hidden">
            <CardHeader className="bg-slate-800/50 p-4">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Configuración de Mapeo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 uppercase font-bold">Google Form URL</Label>
                <Input
                  className="bg-slate-950 border-slate-800 h-9 text-xs"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/.../formResponse"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(entryIds).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[9px] text-slate-500 uppercase">{key}</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 h-8 text-[10px]"
                      value={entryIds[key as keyof typeof entryIds]}
                      onChange={(e) => setEntryIds({ ...entryIds, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs h-10">
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Paso 1: Escaneo */}
        {step === 'scan' && !loading && (
          <div className="flex flex-col items-center justify-center pt-8 gap-8">
            <div 
              className="w-full aspect-[4/5] rounded-[2.5rem] border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center p-8 text-center transition-all hover:border-blue-500/40 hover:bg-blue-500/5 group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Camera className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black italic uppercase mb-2">Escanear Vale</h2>
              <p className="text-slate-400 text-sm max-w-[200px]">Toma una foto clara del vale físico para extraer los datos</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
            
            <div className="w-full grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-16 border-slate-800 bg-slate-900/50 rounded-2xl font-bold" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-5 h-5 mr-2 text-blue-500" />
                Galería
              </Button>
              <Button variant="outline" className="h-16 border-slate-800 bg-slate-900/50 rounded-2xl font-bold" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-5 h-5 mr-2 text-blue-500" />
                Cámara
              </Button>
            </div>
          </div>
        )}

        {/* Cargando */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              <FileText className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-blue-500 font-black tracking-widest text-xs uppercase animate-pulse">Procesando con Visión IA</p>
              <p className="text-[10px] text-slate-500 font-bold italic">Estamos leyendo el texto y los campos...</p>
            </div>
          </div>
        )}

        {/* Paso 2: Revisión (La Encuesta) */}
        {step === 'review' && !loading && (
          <form onSubmit={handleSubmit} className="space-y-6 pb-20">
            {error && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80 font-medium">{error}</p>
              </div>
            )}

            <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
              <CardHeader className="bg-slate-800/30 p-5 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-black italic uppercase">Revisión de Vale</CardTitle>
                    <CardDescription className="text-[10px] font-bold text-blue-500 tracking-wider">VERIFICA LOS DATOS EXTRAÍDOS</CardDescription>
                  </div>
                  {voucherData.numeroVale && (
                    <div className="px-3 py-1 bg-red-600 rounded-lg text-white font-mono font-black text-lg border-2 border-red-500/50">
                      #{voucherData.numeroVale}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {/* Imagen del vale (Previsualización) */}
                {previewUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 mb-6 bg-slate-950">
                    <img src={previewUrl} alt="Vale" className="w-full h-full object-contain opacity-70 contrast-125" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-3">
                      <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Referencia Visual</span>
                    </div>
                  </div>
                )}

                {/* Formulario Estilo Encuesta */}
                <div className="space-y-6">
                  {/* Sección: Identificación */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Información General</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Nº Vale</Label>
                        <Input 
                          value={voucherData.numeroVale} 
                          onChange={(e) => setVoucherData({...voucherData, numeroVale: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm font-black text-red-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Fecha</Label>
                        <Input 
                          value={voucherData.fecha} 
                          onChange={(e) => setVoucherData({...voucherData, fecha: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cliente / Empresa</Label>
                      <Input 
                        value={voucherData.cliente} 
                        onChange={(e) => setVoucherData({...voucherData, cliente: e.target.value})}
                        className="bg-slate-950 border-slate-800 h-11 text-sm font-bold"
                      />
                    </div>
                  </div>

                  {/* Sección: Horas */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Tiempos</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Hora Inicio</Label>
                        <Input 
                          value={voucherData.horaInicio} 
                          onChange={(e) => setVoucherData({...voucherData, horaInicio: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Hora Final</Label>
                        <Input 
                          value={voucherData.horaFinal} 
                          onChange={(e) => setVoucherData({...voucherData, horaFinal: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección: Ruta */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Ruta del Servicio</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Origen</Label>
                        <Input 
                          value={voucherData.origen} 
                          onChange={(e) => setVoucherData({...voucherData, origen: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Destino</Label>
                        <Input 
                          value={voucherData.destino} 
                          onChange={(e) => setVoucherData({...voucherData, destino: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección: Usuario / Pasajero */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Pasajero</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Nombre</Label>
                        <Input 
                          value={voucherData.usuarioNombre} 
                          onChange={(e) => setVoucherData({...voucherData, usuarioNombre: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cédula / ID</Label>
                          <Input 
                            value={voucherData.usuarioIdentificacion} 
                            onChange={(e) => setVoucherData({...voucherData, usuarioIdentificacion: e.target.value})}
                            className="bg-slate-950 border-slate-800 h-11 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Cargo</Label>
                          <Input 
                            value={voucherData.usuarioCargo} 
                            onChange={(e) => setVoucherData({...voucherData, usuarioCargo: e.target.value})}
                            className="bg-slate-950 border-slate-800 h-11 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Operativa */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Operativa</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Placa Vehículo</Label>
                        <Input 
                          value={voucherData.placa} 
                          onChange={(e) => setVoucherData({...voucherData, placa: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm font-black uppercase"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Conductor</Label>
                        <Input 
                          value={voucherData.conductor} 
                          onChange={(e) => setVoucherData({...voucherData, conductor: e.target.value})}
                          className="bg-slate-950 border-slate-800 h-11 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Observaciones</Label>
                      <Textarea 
                        value={voucherData.observaciones} 
                        onChange={(e) => setVoucherData({...voucherData, observaciones: e.target.value})}
                        className="bg-slate-950 border-slate-800 min-h-[80px] text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acciones Fijas Inferiores */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800 flex gap-4 z-50">
              <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl border-slate-800 font-bold uppercase text-xs" onClick={resetApp}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-[2] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-black italic shadow-xl shadow-blue-600/20">
                <Send className="w-5 h-5 mr-3" />
                ENVIAR ENCUESTA
              </Button>
            </div>
          </form>
        )}

        {/* Paso 3: Éxito */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center text-center gap-8 py-20 px-4">
            <div className="relative">
              <div className="w-32 h-32 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 ring-8 ring-green-500/5">
                <CheckCircle2 className="w-20 h-20 animate-in zoom-in-50 duration-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black italic text-white uppercase tracking-tight">Reporte Enviado</h2>
              <p className="text-slate-400 text-sm max-w-[280px] mx-auto">
                El vale <span className="text-white font-bold">#{voucherData.numeroVale}</span> ha sido registrado exitosamente en el sistema.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <Button onClick={resetApp} size="lg" className="w-full h-16 bg-white text-slate-950 hover:bg-slate-200 text-xl font-black italic rounded-2xl transition-all hover:scale-[1.02]">
                <RefreshCcw className="w-6 h-6 mr-3" />
                NUEVO ESCANEO
              </Button>
            </div>
          </div>
        )}
      </div>

      <footer className="py-8 text-center bg-slate-950/50">
        <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em] uppercase">ValeScan Vision v5.0.0 // Transnova Plus</p>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
      `}</style>
    </main>
  );
}
