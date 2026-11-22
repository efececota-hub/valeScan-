'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, Settings, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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

export default function ValeScanApp() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const result = await extractVoucher(base64);
          setVoucherData(result);
        } catch (err) {
          setError('Error al leer el vale. Por favor, intenta de nuevo o ingresa los datos manualmente.');
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

      setSuccess(true);
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
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Error al enviar el formulario. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary">ValeScan</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {showConfig && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>Configura la URL de formResponse y los entry.ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>URL de Google Form (formResponse)</Label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/d/e/.../formResponse"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(entryIds).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="capitalize text-xs">{key.replace('_', ' ')}</Label>
                  <Input
                    className="h-8 text-xs"
                    value={entryIds[key as keyof typeof entryIds]}
                    onChange={(e) => setEntryIds({ ...entryIds, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveConfig} className="w-full">Guardar Configuración</Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl border-muted-foreground/20 bg-muted/5">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <div className="flex gap-4">
              <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                <Camera className="w-5 h-5 mr-2" />
                Cámara
              </Button>
              <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                <Upload className="w-5 h-5 mr-2" />
                Galería
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Toma una foto clara del vale para extraer los datos automáticamente.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center p-4 text-primary">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              <span className="font-medium">Procesando vale...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center p-4 text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="w-5 h-5 mr-3" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center p-4 text-green-500 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 mr-3" />
              <span className="text-sm">¡Vale enviado correctamente!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Vale</Label>
                <Input
                  value={voucherData.numero_vale}
                  onChange={(e) => setVoucherData({ ...voucherData, numero_vale: e.target.value })}
                  placeholder="Ej: 12345"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  value={voucherData.fecha}
                  onChange={(e) => setVoucherData({ ...voucherData, fecha: e.target.value })}
                  placeholder="DD/MM/AAAA"
                />
              </div>
              <div className="space-y-2">
                <Label>Origen</Label>
                <Input
                  value={voucherData.origen}
                  onChange={(e) => setVoucherData({ ...voucherData, origen: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Input
                  value={voucherData.destino}
                  onChange={(e) => setVoucherData({ ...voucherData, destino: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa / Consorcio</Label>
                <Input
                  value={voucherData.empresa}
                  onChange={(e) => setVoucherData({ ...voucherData, empresa: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input
                  value={voucherData.placa}
                  onChange={(e) => setVoucherData({ ...voucherData, placa: e.target.value })}
                  placeholder="ABC-123"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  value={voucherData.valor}
                  onChange={(e) => setVoucherData({ ...voucherData, valor: e.target.value })}
                  placeholder="$ 0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={voucherData.observaciones}
                onChange={(e) => setVoucherData({ ...voucherData, observaciones: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading || !voucherData.numero_vale}>
              <Send className="w-5 h-5 mr-2" />
              Enviar Vale
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground uppercase tracking-tighter">
        ValeScan v2.1 - Sistema Estabilizado
      </p>
    </main>
  );
}
