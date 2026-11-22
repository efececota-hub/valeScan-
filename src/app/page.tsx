'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, Settings, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { extractVoucher, ExtractVoucherOutput } from '@/ai/flows/extract-voucher-flow';

const DEFAULT_ENTRY_IDS = {
  numero_vale: 'entry.123456789',
  fecha: 'entry.987654321',
  origen: 'entry.111222333',
  destino: 'entry.444555666',
  empresa: 'entry.777888999',
  placa: 'entry.000111222',
  valor: 'entry.333444555',
  observaciones: 'entry.666777888',
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
    fecha: '',
    origen: '',
    destino: '',
    empresa: '',
    placa: '',
    valor: '',
    observaciones: '',
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
          setError('No pudimos leer los datos automáticamente. Por favor, intenta de nuevo con una foto más clara.');
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
      setError('Error al enviar los datos. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setVoucherData({
      numero_vale: '',
      fecha: '',
      origen: '',
      destino: '',
      empresa: '',
      placa: '',
      valor: '',
      observaciones: '',
    });
    setStep('scan');
    setError(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 max-w-lg mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-blue-500 uppercase">ValeScan</h1>
          <p className="text-[10px] text-slate-500 font-mono">SISTEMA DE CAPTURA RÁPIDA</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)} className="text-slate-400 hover:text-blue-400">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {showConfig && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuración de Google Forms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">URL formResponse</Label>
              <Input
                className="bg-slate-950 border-slate-800 text-xs h-8"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(entryIds).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase">{key.replace('_', ' ')}</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 text-[10px] h-7"
                    value={entryIds[key as keyof typeof entryIds]}
                    onChange={(e) => setEntryIds({ ...entryIds, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs">Guardar Mapeo</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 flex flex-col justify-center">
        {step === 'scan' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div 
              className="aspect-square rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center p-8 text-center gap-4 hover:border-blue-500/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                <Camera className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Escanear Vale</h3>
                <p className="text-sm text-slate-500">Toma una foto para extraer los datos</p>
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
              className="w-full border-slate-800 text-slate-400 h-12 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Seleccionar de Galería
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 animate-pulse">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-blue-500 font-bold tracking-widest text-xs uppercase">Procesando Información...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 text-red-500 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">{error}</p>
              <Button size="sm" variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={resetApp}>
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && !loading && (
          <Card className="bg-slate-900 border-slate-800 animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="border-b border-slate-800/50 pb-4">
              <CardTitle className="text-lg text-blue-400">Confirmar Encuesta</CardTitle>
              <CardDescription className="text-slate-500">Revisa que la información sea correcta antes de enviar.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Nº Vale</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 h-9"
                      value={voucherData.numero_vale}
                      onChange={(e) => setVoucherData({ ...voucherData, numero_vale: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Fecha</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 h-9"
                      value={voucherData.fecha}
                      onChange={(e) => setVoucherData({ ...voucherData, fecha: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Placa</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 h-9"
                      value={voucherData.placa}
                      onChange={(e) => setVoucherData({ ...voucherData, placa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Valor</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 h-9"
                      value={voucherData.valor}
                      onChange={(e) => setVoucherData({ ...voucherData, valor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Empresa</Label>
                  <Input
                    className="bg-slate-950 border-slate-800 h-9"
                    value={voucherData.empresa}
                    onChange={(e) => setVoucherData({ ...voucherData, empresa: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Origen</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 h-9"
                      value={voucherData.origen}
                      onChange={(e) => setVoucherData({ ...voucherData, origen: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold">Destino</Label>
                    <Input
                      className="bg-slate-950 border-slate-800 h-9"
                      value={voucherData.destino}
                      onChange={(e) => setVoucherData({ ...voucherData, destino: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-bold">Observaciones</Label>
                  <Textarea
                    className="bg-slate-950 border-slate-800 text-sm"
                    value={voucherData.observaciones}
                    onChange={(e) => setVoucherData({ ...voucherData, observaciones: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 border-slate-800" onClick={resetApp}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 font-bold">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Encuesta
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center text-center gap-6 py-12 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-14 h-14" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">¡Vale Enviado!</h2>
              <p className="text-slate-400 mt-2">La información se ha registrado correctamente en Google Forms.</p>
            </div>
            <Button onClick={resetApp} size="lg" className="bg-blue-600 hover:bg-blue-700 w-full rounded-xl h-14 text-lg font-bold">
              <RefreshCcw className="w-5 h-5 mr-2" />
              Nuevo Escaneo
            </Button>
          </div>
        )}
      </div>

      <footer className="mt-auto py-4 text-center">
        <p className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">ValeScan Pro v3.0 // Estabilidad Garantizada</p>
      </footer>
    </main>
  );
}
