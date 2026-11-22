
'use server';
/**
 * @fileOverview Flujo de IA optimizado para vales de Transnova Plus.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractVoucherInputSchema = z.object({
  photoDataUri: z.string().describe("Imagen del vale en formato data URI Base64."),
});

const ExtractVoucherOutputSchema = z.object({
  numero_vale: z.string().describe('Número rojo en la esquina superior derecha.'),
  cliente: z.string().describe('Nombre del cliente (ej. Marcopolo).'),
  fecha: z.string().describe('Fecha del servicio.'),
  hora_inicio: z.string().describe('Hora de inicio del servicio.'),
  hora_final: z.string().describe('Hora final del servicio.'),
  solicitante: z.string().describe('Nombre de la persona que solicita el servicio.'),
  centro_costos: z.string().describe('Número de centro de costos.'),
  origen: z.string().describe('Lugar de origen.'),
  destino: z.string().describe('Lugar de destino.'),
  placa: z.string().describe('Placa del vehículo.'),
  conductor: z.string().describe('Nombre del conductor.'),
  usuarios: z.string().describe('Nombres e identificaciones de los pasajeros.'),
  valor: z.string().describe('Valor del servicio (si está escrito).'),
  observaciones: z.string().describe('Sugerencias o notas adicionales.'),
});

export type ExtractVoucherOutput = z.infer<typeof ExtractVoucherOutputSchema>;

const voucherPrompt = ai.definePrompt({
  name: 'extractVoucherPrompt',
  input: { schema: ExtractVoucherInputSchema },
  output: { schema: ExtractVoucherOutputSchema },
  prompt: `Eres un experto en lectura de vales de transporte de la empresa "Transnova Plus". 
Analiza la foto y extrae la información siguiendo este orden:
- El número de vale es el número ROJO arriba a la derecha.
- Extrae el cliente, solicitante y centro de costos.
- Identifica las horas de inicio y final.
- Extrae origen, destino y la placa.
- En el campo usuarios, combina los nombres y cédulas que aparezcan en la tabla central.

Foto del vale: {{media url=photoDataUri}}`,
});

export async function extractVoucher(photoDataUri: string): Promise<ExtractVoucherOutput> {
  const { output } = await voucherPrompt({ photoDataUri });
  if (!output) throw new Error('No se pudo procesar la imagen del vale');
  return output;
}
