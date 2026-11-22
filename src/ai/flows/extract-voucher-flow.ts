
'use server';
/**
 * @fileOverview Flujo de IA para extraer información de vales de transporte.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractVoucherInputSchema = z.object({
  photoDataUri: z.string().describe("Imagen del vale en formato data URI Base64."),
});

const ExtractVoucherOutputSchema = z.object({
  numero_vale: z.string().describe('Número o código del vale.'),
  fecha: z.string().describe('Fecha del servicio.'),
  origen: z.string().describe('Lugar de origen.'),
  destino: z.string().describe('Lugar de destino.'),
  empresa: z.string().describe('Nombre de la empresa o consorcio.'),
  placa: z.string().describe('Placa del vehículo.'),
  valor: z.string().describe('Valor del servicio.'),
  observaciones: z.string().describe('Observaciones adicionales.'),
});

export type ExtractVoucherOutput = z.infer<typeof ExtractVoucherOutputSchema>;

const voucherPrompt = ai.definePrompt({
  name: 'extractVoucherPrompt',
  input: { schema: ExtractVoucherInputSchema },
  output: { schema: ExtractVoucherOutputSchema },
  prompt: `Eres un experto en lectura de documentos. 
Analiza la siguiente foto de un vale de transporte especial y extrae la información requerida.
Si no encuentras un dato, deja el campo vacío.

Foto del vale: {{media url=photoDataUri}}`,
});

export async function extractVoucher(photoDataUri: string): Promise<ExtractVoucherOutput> {
  const { output } = await voucherPrompt({ photoDataUri });
  if (!output) throw new Error('No se pudo procesar la imagen');
  return output;
}
