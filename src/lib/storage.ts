"use client";

import { Firestore, doc, collection, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";

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

export const getGlobalConfig = async (db: Firestore): Promise<SystemConfig> => {
  try {
    const configRef = doc(db, "configuracion", "general");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return snap.data() as SystemConfig;
    }
    const defaultConfig = { costo_por_vale: 500 };
    await setDoc(configRef, defaultConfig);
    return defaultConfig;
  } catch (err) {
    console.error("Error fetching config:", err);
    return { costo_por_vale: 500 };
  }
};

export const registrarMovimiento = async (db: Firestore, movimiento: Omit<MovimientoSaldo, "fecha">) => {
  try {
    await addDoc(collection(db, "movimientos_saldo"), {
      ...movimiento,
      fecha: serverTimestamp()
    });
  } catch (err) {
    console.error("Error logging movement:", err);
  }
};
