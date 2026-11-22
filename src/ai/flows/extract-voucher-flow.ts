'use server';
/**
 * @fileOverview Flujo de IA multimodal para la extracción de datos de vales de transporte.
 * Lee texto impreso y manuscrito con alta precisión.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractVoucherInputSchema = z.object({
  photoDataUri: z.string().describe("Imagen del vale en formato data URI Base64."),
});

const ExtractVoucherOutputSchema = z.object({
  numeroVale: z.string().describe('Número único del vale (generalmente en rojo o preimpreso).'),
  cliente: z.string().describe('Empresa o entidad que solicita el servicio.'),
  horaInicio: z.string().describe('Hora programada de inicio.'),
  horaFinal: z.string().describe('Hora de terminación del servicio.'),
  solicitante: z.string().describe('Nombre de la persona que pide el servicio.'),
  centroCostos: z.string().describe('Código o nombre del centro de costos.'),
  fecha: z.string().describe('Fecha del servicio (DD/MM/AAAA).'),
  area: z.string().describe('Departamento o área de la empresa.'),
  origen: z.string().describe('Lugar exacto de recogida.'),
  destino: z.string().describe('Lugar exacto de destino.'),
  placa: z.string().describe('Placa del vehículo (3 letras y 3 números).'),
  usuarioNombre: z.string().describe('Nombre del pasajero principal.'),
  usuarioIdentificacion: z.string().describe('Documento de identidad del pasajero.'),
  usuarioCargo: z.string().describe('Cargo del pasajero en la empresa.'),
  conductor: z.string().describe('Nombre del conductor asignado.'),
  observaciones: z.string().describe('Detalles adicionales o novedades.'),
});

export type ExtractVoucherOutput = z.infer<typeof ExtractVoucherOutputSchema>;

const voucherPrompt = ai.definePrompt({
  name: 'extractVoucherPrompt',
  input: { schema: ExtractVoucherInputSchema },
  output: { schema: ExtractVoucherOutputSchema },
  prompt: `Analiza esta foto de una "SOLICITUD DE SERVICIO DE TRANSPORTE". 
Extrae toda la información disponible, prestando especial atención a la letra escrita a mano. 

Reglas críticas:
1. Extrae el "Número de Vale" (suele estar arriba a la derecha).
2. Lee cuidadosamente la tabla de usuarios/pasajeros.
3. Identifica la placa del vehículo (ej. WPO 374).
4. Si un campo no es legible o está vacío, devuelve "". No inventes datos.
5. El formato es para transporte especial (furgonetas/vans/carros blancos).

Imagen: {{media url=photoDataUri}}`,
});

export async function extractVoucher(photoDataUri: string): Promise<ExtractVoucherOutput> {
  try {
    const { output } = await voucherPrompt({ photoDataUri });
    if (!output) {
      throw new Error('No se pudo procesar la imagen.');
    }
    return output;
  } catch (error: any) {
    console.error('Error en extracción multimodal:', error);
    throw new Error('Error al leer el vale. Verifica la conexión o la calidad de la foto.');
  }
}
