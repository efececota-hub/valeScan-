
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { 
  ShieldCheck, CheckCircle, XCircle, Trash2, ArrowLeft, 
  Loader2, Filter, User, Smartphone, MoreHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const ADMIN_PIN = "1234"; // PIN por defecto simple

export default function AdminPanel() {
  const { db, isReady } = useFirebase();
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [conductores, setConductores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'pendiente'>('todos');

  useEffect(() => {
    if (!isReady || !authorized) return;

    const q = query(collection(db, "conductores"), orderBy("fechaRegistro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConductores(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isReady, authorized]);

  const handleLogin = () => {
    if (pin === ADMIN_PIN) {
      setAuthorized(true);
    } else {
      alert("PIN Incorrecto");
    }
  };

  const updateStatus = async (id: string, status: 'aprobado' | 'rechazado') => {
    try {
      await updateDoc(doc(db, "conductores", id), { status });
    } catch (err) {
      console.error("Error al actualizar:", err);
    }
  };

  const deleteConductor = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro?")) {
      try {
        await deleteDoc(doc(db, "conductores", id));
      } catch (err) {
        console.error("Error al eliminar:", err);
      }
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <CardTitle className="text-xl font-black uppercase italic">Panel de Administrador</CardTitle>
            <CardDescription>Ingresa el PIN de seguridad</CardDescription>
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
            <Button onClick={handleLogin} className="w-full h-12 bg-blue-600 font-bold">ACCEDER</Button>
            <Link href="/" className="block text-center text-xs text-slate-500 hover:text-white uppercase font-bold">Volver a la App</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredList = filter === 'pendiente' 
    ? conductores.filter(c => c.status === 'pendiente') 
    : conductores;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <ArrowLeft />
            </Button>
          </Link>
          <h1 className="text-2xl font-black italic uppercase">Gestión de Conductores</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={filter === 'todos' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('todos')}
            className="text-[10px] font-bold uppercase"
          >
            Todos
          </Button>
          <Button 
            variant={filter === 'pendiente' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('pendiente')}
            className="text-[10px] font-bold uppercase"
          >
            Pendientes
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
            <User className="w-12 h-12 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-600 font-bold uppercase">No hay conductores registrados</p>
          </div>
        ) : (
          filteredList.map((c) => (
            <Card key={c.id} className="bg-slate-900 border-slate-800 overflow-hidden group hover:border-slate-700 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    c.status === 'aprobado' ? "bg-green-500/10 text-green-500" :
                    c.status === 'rechazado' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black italic uppercase text-sm leading-none mb-1">{c.nombre}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500">ID: {c.documento}</span>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-bold border-transparent px-2 py-0",
                        c.status === 'aprobado' ? "bg-green-500 text-white" :
                        c.status === 'rechazado' ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                      )}>
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {c.status !== 'aprobado' && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => updateStatus(c.id, 'aprobado')}
                      className="text-green-500 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </Button>
                  )}
                  {c.status !== 'rechazado' && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => updateStatus(c.id, 'rechazado')}
                      className="text-red-500 hover:bg-red-500/10"
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => deleteConductor(c.id)}
                    className="text-slate-600 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
