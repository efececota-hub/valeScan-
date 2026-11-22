'use server';
/**
 * @fileOverview Flujo de IA especializado para extraer datos de vales de Transnova Plus.
 * 
 * - extractVoucher: Función principal para procesar la imagen.
 * - ExtractVoucherOutput: Estructura de datos del vale.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractVoucherInputSchema = z.object({
  photoDataUri: z.string().describe("Imagen del vale en formato data URI Base64."),
});

const ExtractVoucherOutputSchema = z.object({
  numero_vale: z.string().describe('Número rojo en la esquina superior derecha.'),
  cliente: z.string().describe('Nombre del cliente o empresa (ej. Marcopolo).'),
  fecha: z.string().describe('Fecha del servicio en formato DD/MM/AAAA.'),
  hora_inicio: z.string().describe('Hora de inicio escrita en el vale.'),
  hora_final: z.string().describe('Hora final escrita en el vale.'),
  solicitante: z.string().describe('Nombre de la persona que solicita el servicio.'),
  centro_costos: z.string().describe('Número o nombre del centro de costos.'),
  origen: z.string().describe('Dirección o lugar de inicio.'),
  destino: z.string().describe('Dirección o lugar de destino.'),
  placa: z.string().describe('Placa del vehículo (ej. WPO 374).'),
  conductor: z.string().describe('Nombre del conductor asignado.'),
  usuarios: z.string().describe('Nombres de los pasajeros y sus identificaciones.'),
  valor: z.string().describe('Valor numérico del servicio.'),
  observaciones: z.string().describe('Cualquier nota adicional o sugerencia.'),
});

export type ExtractVoucherOutput = z.infer<typeof ExtractVoucherOutputSchema>;

const voucherPrompt = ai.definePrompt({
  name: 'extractVoucherPrompt',
  input: { schema: ExtractVoucherInputSchema },
  output: { schema: ExtractVoucherOutputSchema },
  prompt: `Eres un experto en digitalización de vales de transporte para "Transnova Plus".
Analiza la foto adjunta y extrae la información con precisión quirúrgica.

Instrucciones específicas:
1. El "Número de vale" es el número de 4 o 5 dígitos que aparece en color ROJO arriba a la derecha.
2. Identifica al "Cliente" (ej. Marcopolo) y al "Solicitante" que suele estar cerca del centro de costos.
3. En la tabla de usuarios, extrae los nombres y documentos de identidad.
4. Captura la placa del vehículo (formato 3 letras y 3 números).
5. Si un campo no es legible, intenta deducirlo por el contexto o deja una cadena vacía, pero NO inventes datos.

Imagen del vale: {{media url=photoDataUri}}`,
});

export async function extractVoucher(photoDataUri: string): Promise<ExtractVoucherOutput> {
  try {
    const { output } = await voucherPrompt({ photoDataUri });
    if (!output) {
      throw new Error('La IA no devolvió resultados para esta imagen.');
    }
    return output;
  } catch (error) {
    console.error('Error en extractVoucher flow:', error);
    throw new Error('Error al analizar el vale. Por favor, intenta con una foto más clara.');
  }
}
