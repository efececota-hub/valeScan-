'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Send, Settings, Upload, Loader2, CheckCircle2, 
  AlertCircle, RefreshCcw, FileText, Smartphone, 
  Image as ImageIcon, MapPin, Clock, User, CreditCard, 
  Info, LogOut, ShieldCheck, UserPlus, LogIn, UserCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { extractVoucher, ExtractVoucherOutput } from '@/ai/flows/extract-voucher-flow';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

type AppStep = 'auth' | 'scan' | 'review' | 'success';
type AuthMode = 'login' | 'register' | 'pending';

export default function ValeScanApp() {
  const router = useRouter();
  const { db, isReady } = useFirebase();
  const [step, setStep] = useState<AppStep>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'warning' | 'error' | 'billing' } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // Easter Egg State
  const [logoTaps, setLogoTaps] = useState(0);

  // Auth State
  const [driverDoc, setDriverDoc] = useState('');
  const [driverName, setDriverName] = useState('');
  const [currentDriver, setCurrentDriver] = useState<any>(null);

  // Form Config
  const [formUrl, setFormUrl] = useState(DEFAULT_FORM_URL);
  const [entryIds, setEntryIds] = useState(DEFAULT_ENTRY_IDS);
  
  // Voucher State
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
    const savedDriver = localStorage.getItem('valescan_current_driver');
    
    if (savedIds) setEntryIds(JSON.parse(savedIds));
    if (savedUrl) setFormUrl(savedUrl);
    if (savedDriver) {
      const driver = JSON.parse(savedDriver);
      if (driver.status === 'aprobado') {
        setCurrentDriver(driver);
        setStep('scan');
      }
    }
  }, []);

  const handleLogoTap = () => {
    const newTaps = logoTaps + 1;
    if (newTaps === 3) {
      router.push('/admin');
      setLogoTaps(0);
    } else {
      setLogoTaps(newTaps);
      // Reset taps after 2 seconds of inactivity
      setTimeout(() => setLogoTaps(0), 2000);
    }
  };

  const handleAuth = async () => {
    if (!isReady || !driverDoc) return;
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, "conductores"), where("documento", "==", driverDoc));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setAuthMode('register');
      } else {
        const driverData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any;
        
        if (driverData.status === 'aprobado') {
          localStorage.setItem('valescan_current_driver', JSON.stringify(driverData));
          setCurrentDriver(driverData);
          setStep('scan');
        } else if (driverData.status === 'rechazado') {
          setError({ message: "Tu acceso ha sido denegado por el administrador.", type: 'error' });
        } else {
          setAuthMode('pending');
        }
      }
    } catch (err: any) {
      setError({ message: "Error de conexión con la base de datos.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!driverName || !driverDoc) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "conductores"), where("documento", "==", driverDoc));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError({ message: "Este documento ya está registrado.", type: 'error' });
        setAuthMode('login');
        return;
      }

      await addDoc(collection(db, "conductores"), {
        nombre: driverName,
        documento: driverDoc,
        status: 'pendiente',
        fechaRegistro: serverTimestamp()
      });
      setAuthMode('pending');
    } catch (err) {
      setError({ message: "Error al registrar el conductor.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('valescan_current_driver');
    setCurrentDriver(null);
    setStep('auth');
    setAuthMode('login');
    setDriverDoc('');
    setDriverName('');
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
        setVoucherData({
          ...result,
          conductor: currentDriver?.nombre || ''
        });
        setStep('review');
      } catch (err: any) {
        setError({ message: "Error al leer el vale. Por favor completa los datos manualmente.", type: 'warning' });
        setVoucherData(prev => ({ 
          ...prev, 
          conductor: currentDriver?.nombre || '',
          numeroVale: '', cliente: '', horaInicio: '', horaFinal: '',
          solicitante: '', centroCostos: '', fecha: '', area: '',
          origen: '', destino: '', placa: '', usuarioNombre: '',
          usuarioIdentificacion: '', usuarioCargo: '', observaciones: ''
        }));
        setStep('review');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new URLSearchParams();
    Object.keys(voucherData).forEach((key) => {
      const entryId = entryIds[key as keyof typeof entryIds];
      const value = voucherData[key as keyof typeof voucherData];
      formData.append(entryId, value || '');
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col antialiased">
      <header className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div 
            onClick={handleLogoTap}
            className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition-transform"
          >
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div onClick={handleLogoTap} className="cursor-pointer">
            <h1 className="text-lg font-black tracking-tight leading-none uppercase italic">ValeScan</h1>
            <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">Transnova Plus</span>
          </div>
        </div>
        <div className="flex gap-2">
          {step !== 'auth' && (
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400">
              <LogOut className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowConfig(!showConfig)} className="text-slate-400">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {showConfig && (
          <Card className="bg-slate-900 border-slate-800 mb-6">
            <CardHeader className="p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-black uppercase">Configuración</CardTitle>
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold border-slate-700 bg-slate-800">
                    Panel Admin
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase">Google Form URL</Label>
                <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="bg-slate-950 border-slate-800 h-9 text-xs" />
              </div>
              <Button onClick={() => setShowConfig(false)} className="w-full bg-blue-600 text-xs font-bold uppercase">Guardar</Button>
            </CardContent>
          </Card>
        )}

        {step === 'auth' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div 
              onClick={handleLogoTap}
              className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mb-8 cursor-pointer active:bg-blue-600/20"
            >
              <ShieldCheck className="w-10 h-10 text-blue-500" />
            </div>

            {authMode === 'login' && (
              <Card className="w-full bg-slate-900 border-slate-800 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-black italic uppercase text-center">Acceso Conductor</CardTitle>
                  <CardDescription className="text-center text-xs">Ingresa tu número de documento para comenzar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Nº de Documento</Label>
                    <Input 
                      type="number"
                      placeholder="Ej: 1020304050"
                      value={driverDoc}
                      onChange={(e) => setDriverDoc(e.target.value)}
                      className="bg-slate-950 border-slate-800 h-14 text-xl font-bold text-center tracking-wider"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error.message}</p>
                    </div>
                  )}
                  <div className="space-y-3 pt-2">
                    <Button 
                      onClick={handleAuth} 
                      disabled={loading || !driverDoc}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-black italic shadow-lg shadow-blue-500/10"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <><LogIn className="mr-2 w-5 h-5" /> INGRESAR</>}
                    </Button>
                    
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-600"><span className="bg-slate-900 px-2">O</span></div>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => setAuthMode('register')} 
                      className="w-full h-12 border-slate-800 bg-slate-900 text-xs font-bold uppercase hover:bg-slate-800"
                    >
                      <UserCircle2 className="mr-2 w-4 h-4" /> NO ESTOY REGISTRADO
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {authMode === 'register' && (
              <Card className="w-full bg-slate-900 border-slate-800 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-black italic uppercase text-center">Registro Nuevo</CardTitle>
                  <CardDescription className="text-center text-xs">Completa tus datos para solicitar acceso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Nombre Completo</Label>
                    <Input 
                      placeholder="Nombre y Apellido"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="bg-slate-950 border-slate-800 h-12 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Nº de Documento</Label>
                    <Input 
                      type="number"
                      placeholder="Documento de identidad"
                      value={driverDoc}
                      onChange={(e) => setDriverDoc(e.target.value)}
                      className="bg-slate-950 border-slate-800 h-12 text-lg font-bold"
                    />
                  </div>
                  {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error.message}</p>}
                  <Button 
                    onClick={handleRegister} 
                    disabled={loading || !driverName || !driverDoc}
                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-black italic"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <><UserPlus className="mr-2" /> SOLICITAR ACCESO</>}
                  </Button>
                  <Button variant="ghost" onClick={() => setAuthMode('login')} className="w-full text-[10px] font-bold uppercase text-slate-500">Volver al acceso</Button>
                </CardContent>
              </Card>
            )}

            {authMode === 'pending' && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 shadow-2xl shadow-amber-500/10">
                  <Clock className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black italic uppercase">Solicitud Pendiente</h2>
                  <p className="text-slate-400 text-sm max-w-[280px] mx-auto">Tu registro está en revisión. Contacta al administrador para que apruebe tu acceso.</p>
                </div>
                <Button variant="outline" onClick={() => setAuthMode('login')} className="h-12 px-8 border-slate-800 bg-slate-900 font-bold uppercase rounded-xl">
                  Volver al inicio
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'scan' && (
          <div className="flex flex-col items-center justify-center pt-8 gap-8 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-1">Sesión Activa</p>
              <h2 className="text-2xl font-black italic uppercase">{currentDriver?.nombre}</h2>
            </div>

            <div 
              className="w-full aspect-[4/5] rounded-[2.5rem] border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center p-8 text-center transition-all hover:border-blue-500/40 hover:bg-blue-500/5 group cursor-pointer shadow-inner"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Camera className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black italic uppercase mb-2">Escanear Vale</h2>
              <p className="text-slate-400 text-sm max-w-[200px]">Enfoca bien el texto del vale de Transnova Plus</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
              />
            </div>
            
            <Button variant="outline" className="w-full h-16 border-slate-800 bg-slate-900/50 rounded-2xl font-bold uppercase hover:bg-slate-900" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="w-5 h-5 mr-3 text-blue-500" />
              Galería de Fotos
            </Button>
          </div>
        )}

        {loading && step !== 'auth' && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              <FileText className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-blue-500 font-black tracking-widest text-xs uppercase animate-pulse">Analizando Vale</p>
              <p className="text-[10px] text-slate-500 font-bold italic">Extrayendo datos manuscritos...</p>
            </div>
          </div>
        )}

        {step === 'review' && !loading && (
          <form onSubmit={handleSubmit} className="space-y-6 pb-24">
            <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
              <CardHeader className="bg-slate-800/30 p-5 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-black italic uppercase">Revisión de Datos</CardTitle>
                    <CardDescription className="text-[10px] font-bold text-blue-500 tracking-wider">VERIFICA LA INFORMACIÓN</CardDescription>
                  </div>
                  {voucherData.numeroVale && (
                    <div className="px-3 py-1 bg-red-600 rounded-lg text-white font-mono font-black text-lg shadow-lg">
                      #{voucherData.numeroVale}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {previewUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 mb-6 bg-slate-950">
                    <img src={previewUrl} alt="Vale" className="w-full h-full object-contain" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Nº Vale</Label>
                    <Input value={voucherData.numeroVale} onChange={(e) => setVoucherData({...voucherData, numeroVale: e.target.value})} className="bg-slate-950 border-slate-800 h-10 font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Fecha</Label>
                    <Input value={voucherData.fecha} onChange={(e) => setVoucherData({...voucherData, fecha: e.target.value})} className="bg-slate-950 border-slate-800 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Cliente</Label>
                    <Input value={voucherData.cliente} onChange={(e) => setVoucherData({...voucherData, cliente: e.target.value})} className="bg-slate-950 border-slate-800 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Placa</Label>
                    <Input value={voucherData.placa} onChange={(e) => setVoucherData({...voucherData, placa: e.target.value})} className="bg-slate-950 border-slate-800 h-10 font-black text-blue-400" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Origen</Label>
                    <Input value={voucherData.origen} onChange={(e) => setVoucherData({...voucherData, origen: e.target.value})} className="bg-slate-950 border-slate-800 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Destino</Label>
                    <Input value={voucherData.destino} onChange={(e) => setVoucherData({...voucherData, destino: e.target.value})} className="bg-slate-950 border-slate-800 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Usuario / Pasajero</Label>
                    <Input value={voucherData.usuarioNombre} onChange={(e) => setVoucherData({...voucherData, usuarioNombre: e.target.value})} className="bg-slate-950 border-slate-800 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-black text-slate-500">Conductor</Label>
                    <Input value={voucherData.conductor} readOnly className="bg-slate-950/50 border-slate-800 h-10 text-slate-400 font-bold" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-black text-slate-500">Observaciones</Label>
                  <Textarea value={voucherData.observaciones} onChange={(e) => setVoucherData({...voucherData, observaciones: e.target.value})} className="bg-slate-950 border-slate-800 min-h-[60px]" placeholder="Novedades del servicio..." />
                </div>
              </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 flex gap-4 z-50">
              <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl border-slate-800 font-bold uppercase text-xs" onClick={() => setStep('scan')}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-[2] h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-black italic shadow-xl shadow-blue-600/20">
                <Send className="w-5 h-5 mr-3" />
                ENVIAR REPORTE
              </Button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center text-center gap-8 py-20 animate-in zoom-in-50 duration-500">
            <div className="w-32 h-32 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 shadow-2xl shadow-green-500/20">
              <CheckCircle2 className="w-20 h-20" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black italic text-white uppercase tracking-tight">¡REPORTE ENVIADO!</h2>
              <p className="text-slate-400 text-sm max-w-[280px] mx-auto">
                El vale <span className="text-white font-bold">#{voucherData.numeroVale}</span> se registró correctamente en el sistema.
              </p>
            </div>
            <Button onClick={() => setStep('scan')} size="lg" className="w-full max-w-xs h-16 bg-white text-slate-950 hover:bg-slate-200 text-xl font-black italic rounded-2xl shadow-xl">
              <RefreshCcw className="w-6 h-6 mr-3" />
              NUEVO ESCANEO
            </Button>
          </div>
        )}
      </div>

      <footer className="py-8 text-center bg-slate-950/50 mt-auto border-t border-slate-900">
        <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em] uppercase">ValeScan Vision AI // Gestión de Conductores</p>
      </footer>
    </main>
  );
}
