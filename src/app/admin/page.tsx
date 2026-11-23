'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { 
  collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, 
  getDoc, setDoc, increment, Unsubscribe 
} from 'firebase/firestore';
import { 
  ShieldCheck, CheckCircle, Trash2, ArrowLeft, 
  Loader2, User, Save, PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { registrarMovimiento } from '@/lib/storage';

const ADMIN_PIN = "1234";

export default function AdminPanel() {
  const { db, isReady } = useFirebase();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [conductores, setConductores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [costoVale, setCostoVale] = useState<number>(500);
  const [rechargeAmount, setRechargeAmount] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isReady || !db || !authorized || !mounted) return;

    let unsubConductores: Unsubscribe | null = null;

    const loadData = async () => {
      try {
        const configRef = doc(db, "configuracion", "general");
        const snap = await getDoc(configRef);
        if (snap.exists()) setCostoVale(snap.data().costo_por_vale);

        const q = query(collection(db, "conductores"), orderBy("fechaRegistro", "desc"));
        unsubConductores = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setConductores(docs);
          setLoading(false);
        }, (err) => {
          console.error("Firestore error:", err);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error loading admin data:", err);
      }
    };

    loadData();
    return () => {
      if (unsubConductores) unsubConductores();
    };
  }, [isReady, db, authorized, mounted]);

  const handleLogin = () => {
    if (pin === ADMIN_PIN) setAuthorized(true);
    else alert("PIN Incorrecto");
  };

  const saveGlobalConfig = async () => {
    if (!db) return;
    try {
      await setDoc(doc(db, "configuracion", "general"), { costo_por_vale: Number(costoVale) });
      alert("Configuración guardada");
    } catch (err) {
      alert("Error al guardar: Verifica reglas de Firestore.");
    }
  };

  const updateStatus = async (id: string, status: 'aprobado' | 'rechazado') => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "conductores", id), { status });
    } catch (err) { console.error(err); }
  };

  const handleRecharge = async (conductor: any) => {
    if (!db) return;
    const amount = Number(rechargeAmount[conductor.id]);
    if (!amount || amount <= 0) return;

    try {
      const driverRef = doc(db, "conductores", conductor.id);
      await updateDoc(driverRef, {
        saldo: increment(amount)
      });
      await registrarMovimiento(db, {
        conductorDoc: conductor.documento,
        tipo: "recarga",
        monto: amount,
        detalle: "Recarga de saldo por administrador"
      });
      setRechargeAmount({ ...rechargeAmount, [conductor.id]: '' });
      alert(`$${amount} cargados a ${conductor.nombre}`);
    } catch (err) { alert("Error al recargar"); }
  };

  if (!mounted) return null;

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <CardTitle className="text-xl font-black uppercase italic">Acceso Restringido</CardTitle>
            <CardDescription>Solo personal de Transnova</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              type="password" 
              maxLength={4} 
              placeholder="PIN" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-3xl h-16 tracking-[1em] font-black bg-slate-950 border-slate-800"
            />
            <Button onClick={handleLogin} className="w-full h-12 bg-blue-600 font-bold uppercase italic">Ingresar al Panel</Button>
            <Link href="/" className="block text-center text-[10px] text-slate-500 hover:text-white uppercase font-bold">Volver al Escáner</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="icon" className="text-slate-400"><ArrowLeft /></Button></Link>
          <h1 className="text-2xl font-black italic uppercase">Gestión Operativa</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase italic text-blue-500">Configuración Global</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tarifa por Vale (COP)</label>
              <Input 
                type="number" 
                value={costoVale} 
                onChange={(e) => setCostoVale(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 font-black text-xl"
              />
            </div>
            <Button onClick={saveGlobalConfig} className="w-full bg-blue-600 font-bold uppercase"><Save className="w-4 h-4 mr-2" /> Guardar Cambios</Button>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-sm font-black uppercase italic text-slate-500 ml-1">Control de Conductores</h2>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
          ) : conductores.map((c) => (
            <Card key={c.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center"><User className="w-5 h-5 text-slate-400" /></div>
                    <div>
                      <h3 className="font-black italic uppercase text-sm">{c.nombre}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {c.documento}</p>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-bold mt-1",
                        c.status === 'aprobado' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>{c.status}</Badge>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-2xl flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-slate-600">Saldo</p>
                      <p className={cn("text-lg font-black", (c.saldo || 0) < 500 ? "text-red-500" : "text-green-500")}>${c.saldo || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="COP" 
                        type="number"
                        className="w-20 h-8 text-xs bg-slate-900 border-slate-800"
                        value={rechargeAmount[c.id] || ''}
                        onChange={(e) => setRechargeAmount({...rechargeAmount, [c.id]: e.target.value})}
                      />
                      <Button size="sm" onClick={() => handleRecharge(c)} className="h-8 bg-green-600 px-2"><PlusCircle className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {c.status !== 'aprobado' && (
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(c.id, 'aprobado')} className="text-green-500"><CheckCircle /></Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { if(confirm("¿Eliminar conductor?")) deleteDoc(doc(db!, "conductores", c.id)) }} className="text-slate-600 hover:text-red-500"><Trash2 className="w-5 h-5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
