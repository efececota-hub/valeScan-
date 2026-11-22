
"use client";

import { Firestore, doc, updateDoc, collection, getDocs, query, where, orderBy, addDoc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";

export interface SystemConfig {
  costo_por_vale: number;
}

export interface MovimientoSaldo {
  conductorDoc: string;
  tipo: "recarga" | "descuento";
  monto: number;
  fecha: any;
  detalle: string;
}

export const getGlobalConfig = async (db: any): Promise<SystemConfig> => {
  try {
    const configRef = doc(db, "configuracion", "general");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return snap.data() as SystemConfig;
    }
    // Si no existe, crear por defecto
    const defaultConfig = { costo_por_vale: 500 };
    await setDoc(configRef, defaultConfig);
    return defaultConfig;
  } catch (err) {
    console.error("Error al obtener config:", err);
    return { costo_por_vale: 500 };
  }
};

export const registrarMovimiento = async (db: any, movimiento: Omit<MovimientoSaldo, "fecha">) => {
  try {
    await addDoc(collection(db, "movimientos_saldo"), {
      ...movimiento,
      fecha: serverTimestamp()
    });
  } catch (err) {
    console.error("Error al registrar movimiento:", err);
  }
};
