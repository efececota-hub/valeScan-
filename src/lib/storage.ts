"use client";

import { Firestore, doc, updateDoc, collection, getDocs, query, where, orderBy, addDoc, getDoc, setDoc, increment } from "firebase/firestore";

export type DriverStatus = "pendiente" | "activo" | "suspendido";

export interface Driver {
  id: string;
  name: string;
  document: string;
  status: DriverStatus;
  authorized: boolean;
  saldo: number;
  createdAt: string;
}

export interface SystemConfig {
  costo_por_vale: number;
}

export interface Voucher {
  id: string;
  driverId: string;
  numero_vale: string;
  fecha: string;
  cliente: string;
  origen: string;
  destino: string;
  descripcion: string;
  foto_url: string;
  costo_aplicado?: number;
  createdAt: string;
}

export const getGlobalConfig = async (db: Firestore): Promise<SystemConfig> => {
  const configRef = doc(db, "configuracion", "general");
  const snap = await getDoc(configRef);
  if (snap.exists()) {
    return snap.data() as SystemConfig;
  }
  return { costo_por_vale: 150 };
};

export const saveVoucherWithPayment = async (
  db: Firestore, 
  voucher: Omit<Voucher, "id" | "createdAt">,
  costo: number
) => {
  const vouchersRef = collection(db, "vouchers");
  await addDoc(vouchersRef, {
    ...voucher,
    costo_aplicado: costo,
    createdAt: new Date().toISOString()
  });

  const driverRef = doc(db, "drivers", voucher.driverId);
  await updateDoc(driverRef, {
    saldo: increment(-costo)
  });
};
