'use server';
/**
 * @fileOverview Agente de IA especializado en la extracción de datos de vales de transporte.
 * Optimizado para leer letra manuscrita y formatos estructurados bajo condiciones variables.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractVoucherInputSchema = z.object({
  photoDataUri: z.string().describe("Imagen del vale en formato data URI Base64 (incluyendo prefijo data:image/...)."),
});

const ExtractVoucherOutputSchema = z.object({
  numeroVale: z.string().describe('Número preimpreso del vale (usualmente en rojo o parte superior).'),
  cliente: z.string().describe('Nombre de la empresa o cliente.'),
  horaInicio: z.string().describe('Hora de inicio del servicio.'),
  horaFinal: z.string().describe('Hora de finalización del servicio.'),
  solicitante: z.string().describe('Persona que solicitó el transporte.'),
  centroCostos: z.string().describe('Código o nombre del centro de costos.'),
  fecha: z.string().describe('Fecha del servicio (DD/MM/AAAA).'),
  area: z.string().describe('Área o departamento.'),
  origen: z.string().describe('Lugar de recogida.'),
  destino: z.string().describe('Lugar de destino.'),
  placa: z.string().describe('Placa del vehículo (3 letras y 3 números).'),
  usuarioNombre: z.string().describe('Nombre del pasajero principal.'),
  usuarioIdentificacion: z.string().describe('Cédula o ID del pasajero.'),
  usuarioCargo: z.string().describe('Cargo del pasajero.'),
  conductor: z.string().describe('Nombre del conductor asignado.'),
  observaciones: z.string().describe('Novedades o notas adicionales.'),
});

export type ExtractVoucherOutput = z.infer<typeof ExtractVoucherOutputSchema>;

const voucherPrompt = ai.definePrompt({
  name: 'extractVoucherPrompt',
  input: { schema: ExtractVoucherInputSchema },
  output: { schema: ExtractVoucherOutputSchema },
  prompt: `Eres un sistema experto en procesamiento de documentos de transporte (OCR Multimodal).
Tu tarea es extraer CADA UNO de los campos solicitados del formulario "SOLICITUD DE SERVICIO DE TRANSPORTE".

REGLAS CRÍTICAS:
1. Prioriza el texto escrito a mano con bolígrafo.
2. Si un campo está vacío en el papel, devuelve "".
3. Identifica el número del vale, que suele estar en la parte superior derecha.
4. Extrae la placa del vehículo con precisión.
5. NO inventes datos. Si no es legible, devuelve "".
6. Analiza la imagen con el máximo detalle posible para no omitir información manuscrita.

Imagen del Vale: {{media url=photoDataUri}}`,
});

export async function extractVoucher(photoDataUri: string): Promise<ExtractVoucherOutput> {
  try {
    if (!photoDataUri.startsWith('data:image/')) {
      throw new Error('Formato de imagen inválido. Debe ser una imagen válida.');
    }

    const { output } = await voucherPrompt({ photoDataUri });
    
    if (!output) {
      throw new Error('La IA procesó la imagen pero no devolvió un objeto de datos válido.');
    }

    return output;
  } catch (error: any) {
    // Registramos el error real en los logs del servidor
    console.error('GENKIT_ERROR:', error);
    
    // Propagamos el mensaje de error específico para que el cliente sepa qué falló (API, Cuota, Formato, etc)
    throw new Error(error.message || 'Error desconocido al procesar la imagen con IA.');
  }
}
