'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Send, Settings, Upload, Loader2, CheckCircle2, 
  AlertCircle, RefreshCcw, FileText, Smartphone, 
  Image as ImageIcon, MapPin, Clock, User, CreditCard, 
  Info, LogOut, ShieldCheck, UserPlus, LogIn, UserCircle2,
  History, Share2, ChevronRight, Search, X, CheckSquare, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractVoucher, ExtractVoucherOutput } from '@/ai/flows/extract-voucher-flow';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
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
  descripcionServicio: 'entry.16',
  observaciones: 'entry.17',
};

const DEFAULT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfD_L6p_8B_q-7fVvR5-7W6_1Z_l_v_S_l_v_S_l_v_S_l_v_S/formResponse';

type AppStep = 'auth' | 'scan' | 'review' | 'awaiting_form' | 'success';
type AuthMode = 'login' | 'register' | 'pending';

export default function ValeScanApp() {
  const router = useRouter();
  const { db, isReady } = useFirebase();
  const [step, setStep] = useState<AppStep>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'warning' | 'error' } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  const [logoTaps, setLogoTaps] = useState(0);
  const [driverDoc, setDriverDoc] = useState('');
  const [driverName, setDriverName] = useState('');
  const [currentDriver, setCurrentDriver] = useState<any>(null);

  const [formUrl, setFormUrl] = useState(DEFAULT_FORM_URL);
  const [entryIds, setEntryIds] = useState(DEFAULT_ENTRY_IDS);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<any>(null);
  const [voucherData, setVoucherData] = useState<ExtractVoucherOutput>({
    numeroVale: '', cliente: '', horaInicio: '', horaFinal: '',
    solicitante: '', centroCostos: '', fecha: '', area: '',
    origen: '', destino: '', placa: '', usuarioNombre: '',
    usuarioIdentificacion: '', usuarioCargo: '', conductor: '', 
    descripcionServicio: '', observaciones: '',
  });

  const [history, setHistory] = useState<any[]>([]);
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);
  const [expandedVoucher, setExpandedVoucher] = useState<string | null>(null);

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
        loadHistory(driver.documento);
      }
    }
  }, [isReady]);

  const loadHistory = async (doc: string) => {
    if (!isReady) return;
    try {
      const q = query(
        collection(db, "vales"), 
        where("conductorDoc", "==", doc),
        orderBy("fechaRegistro", "desc"),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const vales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(vales);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    }
  };

  const checkDuplicate = async (numero: string) => {
    if (!numero || !isReady) return false;
    const q = query(collection(db, "vales"), where("numeroVale", "==", numero));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      setDuplicateAlert({
        nombre: data.conductorNombre,
        fecha: data.fechaRegistro?.toDate().toLocaleString() || 'Fecha desconocida'
      });
      return true;
    }
    setDuplicateAlert(null);
    return false;
  };

  const handleLogoTap = () => {
    const newTaps = logoTaps + 1;
    if (newTaps === 3) {
      router.push('/admin');
      setLogoTaps(0);
    } else {
      setLogoTaps(newTaps);
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
          loadHistory(driverData.documento);
        } else if (driverData.status === 'rechazado') {
          setError({ message: "Tu acceso ha sido denegado.", type: 'error' });
        } else {
          setAuthMode('pending');
        }
      }
    } catch (err) {
      setError({ message: "Error de conexión.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!driverName || !driverDoc) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "conductores"), {
        nombre: driverName,
        documento: driverDoc,
        status: 'pendiente',
        fechaRegistro: serverTimestamp()
      });
      setAuthMode('pending');
    } catch (err) {
      setError({ message: "Error al registrar.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      try {
        const result = await extractVoucher(base64);
        setVoucherData({ ...result, conductor: currentDriver?.nombre || '' });
        await checkDuplicate(result.numeroVale);
        setStep('review');
      } catch (err) {
        setStep('review');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenForm = () => {
    const params = new URLSearchParams();
    Object.keys(voucherData).forEach((key) => {
      const entryId = entryIds[key as keyof typeof entryIds];
      const value = voucherData[key as keyof typeof voucherData];
      params.append(entryId, value || '');
    });
    window.open(`${formUrl.replace('/formResponse', '/viewform')}?${params.toString()}`, '_blank');
    setStep('awaiting_form');
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "vales"), {
        ...voucherData,
        conductorNombre: currentDriver.nombre,
        conductorDoc: currentDriver.documento,
        fechaRegistro: serverTimestamp()
      });
      await loadHistory(currentDriver.documento);
      setStep('success');
    } catch (err) {
      alert("Error al guardar en historial");
    } finally {
      setLoading(false);
    }
  };

  const toggleVoucherSelection = (id: string) => {
    setSelectedVouchers(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const shareByWhatsApp = () => {
    const valesToShare = history.filter(v => selectedVouchers.includes(v.id));
    if (valesToShare.length === 0) return;

    let text = `*RESUMEN DE VALES - TRANSNOVA PLUS*\n`;
    text += `Conductor: ${currentDriver.nombre}\n\n`;

    valesToShare.forEach((v, i) => {
      text += `*VALE #${v.numeroVale}*\n`;
      text += `- Cliente: ${v.cliente}\n`;
      text += `- Fecha: ${v.fecha}\n`;
      text += `- Ruta: ${v.origen} -> ${v.destino}\n`;
      text += `- Placa: ${v.placa}\n`;
      text += `- Usuario: ${v.usuarioNombre}\n`;
      text += `--------------------------\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col antialiased">
      <header className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div onClick={handleLogoTap} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition-transform">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div onClick={handleLogoTap} className="cursor-pointer">
            <h1 className="text-lg font-black tracking-tight leading-none uppercase italic">ValeScan</h1>
            <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">Transnova Plus</span>
          </div>
        </div>
        <div className="flex gap-2">
          {step !== 'auth' && (
            <Button variant="ghost" size="icon" onClick={() => {
              localStorage.removeItem('valescan_current_driver');
              setCurrentDriver(null);
              setStep('auth');
            }} className="text-slate-400">
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
              <CardTitle className="text-sm font-black uppercase">Configuración</CardTitle>
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
          <div className="py-12 flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mb-8">
              <ShieldCheck className="w-10 h-10 text-blue-500" />
            </div>
            {authMode === 'login' ? (
              <Card className="w-full bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-center uppercase">Ingreso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input type="number" placeholder="Nº Documento" value={driverDoc} onChange={(e) => setDriverDoc(e.target.value)} className="h-14 text-xl text-center font-bold" />
                  {error && <p className="text-red-500 text-xs text-center font-bold">{error.message}</p>}
                  <Button onClick={handleAuth} disabled={loading} className="w-full h-14 bg-blue-600 font-black">INGRESAR</Button>
                  <Button variant="link" onClick={() => setAuthMode('register')} className="w-full text-slate-500">No estoy registrado</Button>
                </CardContent>
              </Card>
            ) : authMode === 'register' ? (
              <Card className="w-full bg-slate-900 border-slate-800">
                <CardHeader><CardTitle className="text-center">REGISTRO</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Nombre Completo" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                  <Input type="number" placeholder="Documento" value={driverDoc} onChange={(e) => setDriverDoc(e.target.value)} />
                  <Button onClick={handleRegister} className="w-full h-14 bg-green-600">REGISTRARME</Button>
                  <Button variant="link" onClick={() => setAuthMode('login')} className="w-full">Volver al ingreso</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl">
                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold uppercase">Solicitud Pendiente</h3>
                <p className="text-slate-500 text-sm mt-2">Tu acceso debe ser aprobado por el administrador.</p>
                <Button variant="outline" className="mt-6" onClick={() => setAuthMode('login')}>Volver</Button>
              </div>
            )}
          </div>
        )}

        {step === 'scan' && (
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900 mb-8">
              <TabsTrigger value="scanner" className="font-bold uppercase italic"><Camera className="w-4 h-4 mr-2"/> Escanear</TabsTrigger>
              <TabsTrigger value="history" className="font-bold uppercase italic"><History className="w-4 h-4 mr-2"/> Historial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scanner" className="flex flex-col items-center gap-6">
              <div 
                className="w-full aspect-[4/5] rounded-[2.5rem] border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-16 h-16 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                <h2 className="text-2xl font-black italic uppercase">Subir Foto</h2>
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black italic uppercase text-blue-500">Vales Registrados</h3>
                {selectedVouchers.length > 0 && (
                  <Button onClick={shareByWhatsApp} size="sm" className="bg-green-600 font-bold animate-pulse">
                    <Share2 className="w-4 h-4 mr-2" /> Compartir ({selectedVouchers.length})
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 font-bold uppercase">No hay vales registrados</div>
                ) : history.map(v => (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleVoucherSelection(v.id)} className="text-blue-500">
                          {selectedVouchers.includes(v.id) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                        </button>
                        <div onClick={() => setExpandedVoucher(expandedVoucher === v.id ? null : v.id)} className="cursor-pointer">
                          <p className="text-xs font-black text-blue-400">VALE #{v.numeroVale}</p>
                          <p className="text-[10px] text-slate-500">{v.cliente} • {v.fecha}</p>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 text-slate-700 transition-transform", expandedVoucher === v.id && "rotate-90")} />
                    </div>
                    {expandedVoucher === v.id && (
                      <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-[11px] grid grid-cols-2 gap-y-2 gap-x-4">
                        <div className="col-span-2 text-blue-500 font-bold uppercase tracking-widest border-b border-slate-800 pb-1 mb-1">Detalle del Servicio</div>
                        <div><span className="text-slate-500 block uppercase font-black text-[9px]">Pasajero</span>{v.usuarioNombre}</div>
                        <div><span className="text-slate-500 block uppercase font-black text-[9px]">Placa</span>{v.placa}</div>
                        <div><span className="text-slate-500 block uppercase font-black text-[9px]">Origen</span>{v.origen}</div>
                        <div><span className="text-slate-500 block uppercase font-black text-[9px]">Destino</span>{v.destino}</div>
                        <div className="col-span-2"><span className="text-slate-500 block uppercase font-black text-[9px]">Descripción</span>{v.descripcionServicio}</div>
                        <div className="col-span-2"><span className="text-slate-500 block uppercase font-black text-[9px]">Observaciones</span>{v.observaciones}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {loading && <div className="py-20 text-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" /><p className="mt-4 font-black uppercase text-xs italic animate-pulse">Procesando...</p></div>}

        {step === 'review' && !loading && (
          <form onSubmit={(e) => { e.preventDefault(); handleOpenForm(); }} className="space-y-6 pb-20">
            {duplicateAlert && (
              <div className="bg-red-600/20 border border-red-600 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-600 w-6 h-6 shrink-0" />
                <div>
                  <p className="text-red-500 font-black uppercase text-sm italic leading-none mb-1">¡VALE DUPLICADO!</p>
                  <p className="text-xs text-red-300">Este vale ya fue registrado por **{duplicateAlert.nombre}** el día {duplicateAlert.fecha}.</p>
                </div>
              </div>
            )}
            
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800"><CardTitle className="text-lg uppercase italic font-black">Validar Información</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Nº Vale</Label><Input value={voucherData.numeroVale} onChange={(e) => setVoucherData({...voucherData, numeroVale: e.target.value})} className="bg-slate-950 font-bold border-red-600/30 text-red-500" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Fecha</Label><Input value={voucherData.fecha} onChange={(e) => setVoucherData({...voucherData, fecha: e.target.value})} className="bg-slate-950" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Hora Inicio</Label><Input value={voucherData.horaInicio} onChange={(e) => setVoucherData({...voucherData, horaInicio: e.target.value})} className="bg-slate-950" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Hora Fin</Label><Input value={voucherData.horaFinal} onChange={(e) => setVoucherData({...voucherData, horaFinal: e.target.value})} className="bg-slate-950" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Cliente / Empresa</Label><Input value={voucherData.cliente} onChange={(e) => setVoucherData({...voucherData, cliente: e.target.value})} className="bg-slate-950 font-bold" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Solicitante</Label><Input value={voucherData.solicitante} onChange={(e) => setVoucherData({...voucherData, solicitante: e.target.value})} className="bg-slate-950" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Centro Costos</Label><Input value={voucherData.centroCostos} onChange={(e) => setVoucherData({...voucherData, centroCostos: e.target.value})} className="bg-slate-950" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Descripción del Servicio</Label><Textarea value={voucherData.descripcionServicio} onChange={(e) => setVoucherData({...voucherData, descripcionServicio: e.target.value})} className="bg-slate-950 min-h-[60px]" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Origen</Label><Input value={voucherData.origen} onChange={(e) => setVoucherData({...voucherData, origen: e.target.value})} className="bg-slate-950" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Destino</Label><Input value={voucherData.destino} onChange={(e) => setVoucherData({...voucherData, destino: e.target.value})} className="bg-slate-950" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Placa</Label><Input value={voucherData.placa} onChange={(e) => setVoucherData({...voucherData, placa: e.target.value})} className="bg-slate-950 font-black text-blue-500" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Pasajero</Label><Input value={voucherData.usuarioNombre} onChange={(e) => setVoucherData({...voucherData, usuarioNombre: e.target.value})} className="bg-slate-950" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Observaciones</Label><Textarea value={voucherData.observaciones} onChange={(e) => setVoucherData({...voucherData, observaciones: e.target.value})} className="bg-slate-950" /></div>
              </CardContent>
            </Card>
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 border-t border-slate-800 flex gap-3 z-50">
              <Button type="button" variant="outline" onClick={() => setStep('scan')} className="flex-1 h-14 font-bold uppercase italic">Atrás</Button>
              <Button type="submit" disabled={!!duplicateAlert} className="flex-[2] h-14 bg-blue-600 font-black text-lg italic shadow-xl shadow-blue-500/20">IR A GOOGLE FORMS</Button>
            </div>
          </form>
        )}

        {step === 'awaiting_form' && (
          <div className="py-20 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center animate-pulse">
              <Send className="w-12 h-12 text-blue-500" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-black italic uppercase">¿Enviaste la encuesta?</h2>
              <p className="text-slate-400 text-sm max-w-[280px] mx-auto">Confirma cuando hayas terminado de enviar los datos en Google Forms para registrar el vale en tu historial.</p>
            </div>
            <div className="w-full space-y-3">
              <Button onClick={handleFinalConfirm} disabled={loading} className="w-full h-16 bg-green-600 font-black text-lg italic shadow-xl shadow-green-500/20">
                {loading ? <Loader2 className="animate-spin" /> : "SÍ, CONFIRMAR Y REGISTRAR"}
              </Button>
              <Button variant="ghost" onClick={() => setStep('review')} className="w-full text-slate-500 uppercase font-bold text-xs">Aún no, volver al formulario</Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-20 flex flex-col items-center text-center gap-8">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 shadow-2xl shadow-green-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase">¡VALE REGISTRADO!</h2>
              <p className="text-slate-400 text-sm">El vale #{voucherData.numeroVale} ya está en tu historial.</p>
            </div>
            <Button onClick={() => setStep('scan')} className="w-full h-14 bg-white text-slate-950 font-black italic rounded-2xl">REVISAR HISTORIAL / NUEVO</Button>
          </div>
        )}
      </div>
    </main>
  );
}
