'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Send, Smartphone, Loader2, CheckCircle2, 
  AlertCircle, History, Clock, 
  ChevronRight, CheckSquare, Square, Share2, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractVoucher, ExtractVoucherOutput } from '@/ai/flows/extract-voucher-flow';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import { 
  collection, query, where, getDocs, addDoc, serverTimestamp, 
  doc, onSnapshot, updateDoc, increment, Unsubscribe 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { registrarMovimiento, getGlobalConfig } from '@/lib/storage';

const GOOGLE_FORM_URL = 'https://forms.gle/zFs9UPsMoMXndHjK7';

type AppStep = 'auth' | 'scan' | 'review' | 'awaiting_form' | 'success';
type AuthMode = 'login' | 'register' | 'pending';

export default function ValeScanApp() {
  const router = useRouter();
  const { db, isReady } = useFirebase();
  const [step, setStep] = useState<AppStep>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [logoTaps, setLogoTaps] = useState(0);
  const [driverDoc, setDriverDoc] = useState('');
  const [driverName, setDriverName] = useState('');
  const [currentDriver, setCurrentDriver] = useState<any>(null);
  const [costoPorVale, setCostoPorVale] = useState(500);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{ nombre: string; fecha: string } | null>(null);
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

  // Efecto de inicialización para evitar errores de hidratación
  useEffect(() => {
    if (!isReady || !db) return;

    let unsubDriver: Unsubscribe | null = null;

    const init = async () => {
      try {
        const cfg = await getGlobalConfig(db);
        setCostoPorVale(cfg.costo_por_vale);

        const savedDriver = localStorage.getItem('valescan_current_driver');
        if (savedDriver) {
          const d = JSON.parse(savedDriver);
          unsubDriver = onSnapshot(doc(db, "conductores", d.id), (snap) => {
            if (snap.exists()) {
              const freshData = { id: snap.id, ...snap.data() };
              setCurrentDriver(freshData);
              if (freshData.status === 'aprobado') {
                setStep('scan');
                loadHistory(freshData.documento);
              } else if (freshData.status === 'rechazado') {
                setError("Acceso denegado.");
                setStep('auth');
              } else {
                setStep('auth');
                setAuthMode('pending');
              }
            }
          });
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    init();
    return () => {
      if (unsubDriver) unsubDriver();
    };
  }, [isReady, db]);

  const loadHistory = async (docStr: string) => {
    if (!db) return;
    try {
      const q = query(collection(db, "vales"), where("conductorDoc", "==", docStr));
      const snapshot = await getDocs(q);
      const vales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      vales.sort((a: any, b: any) => {
        const timeA = a.fechaRegistro?.toMillis?.() || 0;
        const timeB = b.fechaRegistro?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setHistory(vales.slice(0, 20));
    } catch (err) { 
      console.error("History load error:", err);
    }
  };

  const handleAuth = async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "conductores"), where("documento", "==", driverDoc));
      const snap = await getDocs(q);
      if (snap.empty) { 
        setAuthMode('register'); 
      } else {
        const d = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        if (d.status === 'aprobado') {
          localStorage.setItem('valescan_current_driver', JSON.stringify(d));
          setCurrentDriver(d);
          setStep('scan');
          loadHistory(d.documento);
        } else if (d.status === 'rechazado') {
          setError("Acceso denegado por el administrador.");
        } else { 
          setAuthMode('pending'); 
        }
      }
    } catch (err: any) { 
      setError(err.message || "Error de conexión."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleRegister = async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, "conductores"), {
        nombre: driverName, documento: driverDoc, status: 'pendiente', 
        saldo: 0, fechaRegistro: serverTimestamp()
      });
      setAuthMode('pending');
    } catch (err: any) { 
      setError("Error al registrar conductor."); 
    } finally { 
      setLoading(false); 
    }
  };

  const processFile = async (file: File) => {
    if (!currentDriver || (currentDriver.saldo || 0) < costoPorVale) {
      alert(`Saldo insuficiente ($${currentDriver.saldo || 0}). Contacta con administración.`);
      return;
    }
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      try {
        const result = await extractVoucher(base64);
        setVoucherData({ ...result, conductor: currentDriver.nombre });
        
        if (db) {
          const qDup = query(collection(db, "vales"), where("numeroVale", "==", result.numeroVale));
          const snapDup = await getDocs(qDup);
          if (!snapDup.empty) {
            const d = snapDup.docs[0].data();
            setDuplicateAlert({ 
              nombre: d.conductorNombre || 'Otro conductor', 
              fecha: d.fechaRegistro?.toDate?.().toLocaleString() || 'Desconocida'
            });
          } else { 
            setDuplicateAlert(null); 
          }
        }
        setStep('review');
      } catch (err: any) { 
        console.error("AI Error:", err);
        setError("Error en IA. Puedes completar los campos manualmente.");
        setStep('review'); 
      } finally { 
        setLoading(false); 
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinalConfirm = async () => {
    if (!db || !currentDriver) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "vales"), {
        ...voucherData,
        conductorNombre: currentDriver.nombre,
        conductorDoc: currentDriver.documento,
        fechaRegistro: serverTimestamp()
      });

      const driverRef = doc(db, "conductores", currentDriver.id);
      await updateDoc(driverRef, {
        saldo: increment(-costoPorVale)
      });

      await registrarMovimiento(db, {
        conductorDoc: currentDriver.documento,
        tipo: "descuento",
        monto: costoPorVale,
        detalle: `Vale #${voucherData.numeroVale}`
      });

      await loadHistory(currentDriver.documento);
      setStep('success');
    } catch (err) {
      alert("Error al registrar el vale.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoTap = () => {
    const nextTaps = logoTaps + 1;
    if (nextTaps >= 3) {
      router.push('/admin');
      setLogoTaps(0);
    } else {
      setLogoTaps(nextTaps);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div 
            onClick={handleLogoTap} 
            className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg cursor-pointer active:scale-95 transition-transform"
          >
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase italic">ValeScan</h1>
            <span className="text-[9px] text-blue-500 font-bold uppercase">Transnova Plus</span>
          </div>
        </div>
        <div className="flex gap-2">
          {step !== 'auth' && currentDriver && (
            <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-slate-500 leading-none">Mi Saldo</p>
                <p className={cn("text-xs font-black", (currentDriver.saldo || 0) < costoPorVale ? "text-red-500" : "text-green-500")}>
                  ${currentDriver.saldo || 0}
                </p>
              </div>
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl text-[10px] font-bold text-center">
            {error}
          </div>
        )}

        {step === 'auth' && (
          <div className="py-12 flex flex-col items-center">
            <div onClick={handleLogoTap} className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mb-8 cursor-pointer">
              <Smartphone className="w-10 h-10 text-blue-500" />
            </div>
            {authMode === 'login' ? (
              <Card className="w-full bg-slate-900 border-slate-800">
                <CardHeader><CardTitle className="text-xl font-black text-center uppercase italic">Ingreso Conductor</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input type="number" placeholder="Documento de Identidad" value={driverDoc} onChange={(e) => setDriverDoc(e.target.value)} className="h-14 text-xl text-center font-bold" />
                  <Button onClick={handleAuth} disabled={loading} className="w-full h-14 bg-blue-600 font-black italic uppercase">ENTRAR</Button>
                  <Button variant="link" onClick={() => setAuthMode('register')} className="w-full text-slate-500 text-xs uppercase font-bold">No estoy registrado</Button>
                </CardContent>
              </Card>
            ) : authMode === 'register' ? (
              <Card className="w-full bg-slate-900 border-slate-800">
                <CardHeader><CardTitle className="text-center font-black uppercase italic">REGISTRO</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Nombre Completo" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                  <Input type="number" placeholder="Número de Documento" value={driverDoc} onChange={(e) => setDriverDoc(e.target.value)} />
                  <Button onClick={handleRegister} className="w-full h-14 bg-green-600 font-black italic uppercase">SOLICITAR ACCESO</Button>
                  <Button variant="link" onClick={() => setAuthMode('login')} className="w-full text-slate-500 uppercase font-bold text-xs">Ya tengo cuenta</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl">
                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold uppercase italic">Acceso Pendiente</h3>
                <p className="text-slate-500 text-sm mt-2">Tu registro está en revisión por el administrador.</p>
              </div>
            )}
          </div>
        )}

        {step === 'scan' && (
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900 mb-6">
              <TabsTrigger value="scanner" className="font-bold uppercase italic"><Camera className="w-4 h-4 mr-2"/> Escáner</TabsTrigger>
              <TabsTrigger value="history" className="font-bold uppercase italic"><History className="w-4 h-4 mr-2"/> Mis Vales</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scanner">
              {(currentDriver?.saldo || 0) < costoPorVale ? (
                <div className="p-8 border-2 border-dashed border-red-500/30 rounded-[2.5rem] bg-red-500/5 text-center space-y-4">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                  <h2 className="text-2xl font-black italic uppercase text-red-500">Saldo Insuficiente</h2>
                  <p className="text-slate-400 text-sm italic">Saldo: <b>${currentDriver?.saldo || 0}</b>. Costo vale: <b>${costoPorVale}</b>.</p>
                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-300">Recarga saldo con el administrador para continuar.</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-full aspect-[4/5] rounded-[2.5rem] border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-16 h-16 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                  <h2 className="text-2xl font-black italic uppercase">Escanear Vale</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Escanea el vale físico</p>
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black italic uppercase text-blue-500">Historial</h3>
                {selectedVouchers.length > 0 && (
                  <Button onClick={() => {
                    let txt = `*REPORTE DE VALES - TRANSNOVA*\nConductor: ${currentDriver.nombre}\n\n`;
                    history.filter(v => selectedVouchers.includes(v.id)).forEach(v => {
                      txt += `*VALE #${v.numeroVale}* (${v.fecha})\nCliente: ${v.cliente}\nRuta: ${v.origen} -> ${v.destino}\n------------------\n`;
                    });
                    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
                  }} size="sm" className="bg-green-600 font-bold">
                    <Share2 className="w-4 h-4 mr-2" /> Compartir ({selectedVouchers.length})
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-600 font-bold uppercase italic text-sm">Sin vales registrados</p>
                  </div>
                ) : history.map(v => (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedVouchers(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id])} className="text-blue-500">
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
                      <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-[10px] grid grid-cols-2 gap-2">
                        <div><span className="text-slate-600 uppercase font-black">Pasajero:</span> {v.usuarioNombre}</div>
                        <div><span className="text-slate-600 uppercase font-black">Placa:</span> {v.placa}</div>
                        <div className="col-span-2"><span className="text-slate-600 uppercase font-black">Ruta:</span> {v.origen} → {v.destino}</div>
                        <div className="col-span-2"><span className="text-slate-600 uppercase font-black">Descripción:</span> {v.descripcionServicio}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {loading && <div className="py-20 text-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" /></div>}

        {step === 'review' && !loading && (
          <div className="space-y-6 pb-24">
            {duplicateAlert && (
              <div className="bg-red-600/20 border border-red-600 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-600 w-5 h-5" />
                <div>
                  <p className="text-red-500 font-black uppercase text-xs italic">VALE DUPLICADO</p>
                  <p className="text-[10px] text-red-300">Registrado por {duplicateAlert.nombre} el {duplicateAlert.fecha}.</p>
                </div>
              </div>
            )}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="p-4 border-b border-slate-800">
                <CardTitle className="text-sm font-black uppercase italic">Revisión de Datos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Nº Vale</Label><Input value={voucherData.numeroVale} onChange={(e) => setVoucherData({...voucherData, numeroVale: e.target.value})} className="bg-slate-950" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Fecha</Label><Input value={voucherData.fecha} onChange={(e) => setVoucherData({...voucherData, fecha: e.target.value})} className="bg-slate-950" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Cliente</Label><Input value={voucherData.cliente} onChange={(e) => setVoucherData({...voucherData, cliente: e.target.value})} className="bg-slate-950" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Origen</Label><Input value={voucherData.origen} onChange={(e) => setVoucherData({...voucherData, origen: e.target.value})} className="bg-slate-950" /></div>
                  <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Destino</Label><Input value={voucherData.destino} onChange={(e) => setVoucherData({...voucherData, destino: e.target.value})} className="bg-slate-950" /></div>
                </div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Pasajero</Label><Input value={voucherData.usuarioNombre} onChange={(e) => setVoucherData({...voucherData, usuarioNombre: e.target.value})} className="bg-slate-950" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500">Descripción</Label><Input value={voucherData.descripcionServicio} onChange={(e) => setVoucherData({...voucherData, descripcionServicio: e.target.value})} className="bg-slate-950" /></div>
              </CardContent>
            </Card>
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 border-t border-slate-800 flex gap-3 backdrop-blur-md">
              <Button variant="outline" onClick={() => setStep('scan')} className="flex-1 h-14 font-black uppercase">Atrás</Button>
              <Button 
                disabled={!!duplicateAlert} 
                onClick={() => {
                  window.open(GOOGLE_FORM_URL, '_blank');
                  setStep('awaiting_form');
                }} 
                className="flex-[2] h-14 bg-blue-600 font-black text-lg italic uppercase"
              >
                Abrir Encuesta
              </Button>
            </div>
          </div>
        )}

        {step === 'awaiting_form' && (
          <div className="py-12 flex flex-col items-center text-center gap-8">
            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center animate-pulse"><Send className="w-10 h-10 text-blue-500" /></div>
            <div>
              <h2 className="text-xl font-black italic uppercase">¿Enviaste la encuesta?</h2>
              <p className="text-slate-400 text-xs mt-2">Confirma para guardar y descontar de tu saldo.</p>
            </div>
            <div className="w-full space-y-3">
              <Button onClick={handleFinalConfirm} disabled={loading} className="w-full h-16 bg-green-600 font-black text-lg italic uppercase">SÍ, CONFIRMAR</Button>
              <Button variant="ghost" onClick={() => setStep('review')} className="w-full text-slate-500 uppercase font-bold text-[10px]">No, volver</Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-20 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500"><CheckCircle2 className="w-12 h-12" /></div>
            <h2 className="text-2xl font-black italic uppercase">¡GUARDADO!</h2>
            <p className="text-slate-400 text-sm italic">Vale registrado con éxito.</p>
            <Button onClick={() => setStep('scan')} className="w-full h-14 bg-white text-slate-950 font-black italic rounded-2xl uppercase">Entendido</Button>
          </div>
        )}
      </div>
    </main>
  );
}
