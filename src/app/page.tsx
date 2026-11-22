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
    numero_vale: '', cliente: '', fecha: '', hora_inicio: '', hora_final: '',
    solicitante: '', centro_costos: '', origen: '', destino: '', placa: '',
    conductor: '', usuarios: '', valor: '', observaciones: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedIds = localStorage.getItem('valescan_config_ids');
    const savedUrl = localStorage.getItem('valescan_config_url');
    if (savedIds) setEntryIds(JSON.parse(savedIds));
    if (savedUrl) setFormUrl(savedUrl);
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('valescan_config_ids', JSON.stringify(entryIds));
    localStorage.setItem('valescan_config_url', formUrl);
    setShowConfig(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (!base64) {
        setError("No se pudo procesar la imagen.");
        setLoading(false);
        return;
      }
      
      try {
        const result = await extractVoucher(base64);
        setVoucherData(result);
        setStep('review');
      } catch (err: any) {
        setError(err.message || 'La IA no pudo leer los datos. Intenta con una foto más clara.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Error al cargar la foto.");
      setLoading(false);
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
      setError('Error al enviar los datos al formulario de Google.');
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
    <main className="min-h-screen bg-[#020617] text-slate-50 flex flex-col font-sans">
      <header className="px-4 py-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 p-2 rounded-xl">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">ValeScan</h1>
            <p className="text-[10px] text-blue-500 font-bold tracking-[0.2em] mt-0.5">TRANSNOVA PLUS</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)} className="text-slate-400">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 p-4 max-w-xl mx-auto w-full">
        {showConfig && (
          <Card className="bg-slate-900 border-slate-800 mb-4">
            <CardHeader className="p-4 border-b border-slate-800 bg-slate-800/30">
              <CardTitle className="text-xs font-bold text-blue-400 uppercase tracking-widest">Configuración Google Form</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500 uppercase font-bold">URL de Envío</Label>
                <Input
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
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
              <Button onClick={handleSaveConfig} className="w-full bg-blue-600 font-bold uppercase text-xs">
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'scan' && !loading && (
          <div className="space-y-6 py-8 flex flex-col items-center">
            <div 
              className="group relative aspect-[3/4] w-full max-w-xs rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center p-8 text-center gap-6 cursor-pointer hover:border-blue-500/50 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500">
                <Camera className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white italic">ESCANEAR VALE</h3>
                <p className="text-sm text-slate-400">Captura o sube la foto del vale físico</p>
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
              className="w-full max-w-xs border-slate-800 bg-slate-900/50 text-slate-300 h-14 rounded-2xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5 mr-3" />
              Seleccionar de Galería
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <div className="text-center">
              <p className="text-blue-500 font-black tracking-widest text-xs uppercase animate-pulse">Analizando Vale con IA</p>
              <p className="text-[10px] text-slate-500 mt-1">Espera un momento...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div className="space-y-1">
                <h4 className="font-bold text-red-500 text-sm">ERROR DE LECTURA</h4>
                <p className="text-sm text-red-200/80">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="border-red-500/30 text-red-400 h-12 rounded-xl" onClick={resetApp}>
              Reintentar Escaneo
            </Button>
          </div>
        )}

        {step === 'review' && !loading && (
          <Card className="bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="border-b border-slate-800/50 bg-slate-950/30 p-5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-black italic text-white">REVISIÓN DE DATOS</CardTitle>
                  <CardDescription className="text-slate-400 text-[10px] uppercase font-bold">Verifica la información extraída</CardDescription>
                </div>
                {voucherData.numero_vale && (
                  <div className="bg-red-600 px-3 py-1.5 rounded-lg text-white font-mono font-bold border border-red-500/50">
                    #{voucherData.numero_vale}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-500 uppercase font-black">Cliente</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.cliente}
                        onChange={(e) => setVoucherData({ ...voucherData, cliente: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-500 uppercase font-black">Fecha</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.fecha}
                        onChange={(e) => setVoucherData({ ...voucherData, fecha: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Solicitante</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.solicitante}
                        onChange={(e) => setVoucherData({ ...voucherData, solicitante: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Centro Costos</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.centro_costos}
                        onChange={(e) => setVoucherData({ ...voucherData, centro_costos: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-black">Origen</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.origen}
                        onChange={(e) => setVoucherData({ ...voucherData, origen: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-blue-400 uppercase font-black">Destino</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.destino}
                        onChange={(e) => setVoucherData({ ...voucherData, destino: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Placa</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm font-bold uppercase"
                        value={voucherData.placa}
                        onChange={(e) => setVoucherData({ ...voucherData, placa: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Conductor</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.conductor}
                        onChange={(e) => setVoucherData({ ...voucherData, conductor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Pasajeros</Label>
                    <Textarea
                      className="bg-slate-950 border-slate-800 text-sm min-h-[60px]"
                      value={voucherData.usuarios}
                      onChange={(e) => setVoucherData({ ...voucherData, usuarios: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-green-500 uppercase font-black">Valor $</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm font-black text-green-500"
                        value={voucherData.valor}
                        onChange={(e) => setVoucherData({ ...voucherData, valor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Observaciones</Label>
                      <Input
                        className="bg-slate-950 border-slate-800 h-10 text-sm"
                        value={voucherData.observaciones}
                        onChange={(e) => setVoucherData({ ...voucherData, observaciones: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="ghost" className="flex-1 text-slate-500 uppercase font-bold text-xs" onClick={resetApp}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-[2] bg-blue-600 h-14 rounded-2xl text-lg font-black italic">
                    <Send className="w-5 h-5 mr-3" />
                    ENVIAR REPORTE
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center text-center gap-8 py-20">
            <div className="w-32 h-32 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 ring-8 ring-green-500/5">
              <CheckCircle2 className="w-20 h-20" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">¡Envío Exitoso!</h2>
              <p className="text-slate-400 text-sm px-6">
                El vale <span className="text-white font-bold">#{voucherData.numero_vale}</span> se registró correctamente.
              </p>
            </div>
            <Button onClick={resetApp} size="lg" className="bg-white text-slate-950 w-full max-w-xs h-16 text-xl font-black italic rounded-2xl">
              <RefreshCcw className="w-6 h-6 mr-3" />
              NUEVO ESCANEO
            </Button>
          </div>
        )}
      </div>

      <footer className="py-6 text-center border-t border-slate-900/50 bg-slate-950/20">
        <p className="text-[9px] text-slate-600 font-bold tracking-[0.4em] uppercase">Transnova Plus // ValeScan v4.2.0</p>
      </footer>
    </main>
  );
}
