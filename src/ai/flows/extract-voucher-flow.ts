'use server';
/**
 * @fileOverview Agente de IA optimizado para la lectura de vales de transporte especial.
 * Diseñado para leer texto impreso y manuscrito en condiciones de fotos reales (sombras, ángulos).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractVoucherInputSchema = z.object({
  photoDataUri: z.string().describe("Imagen del vale en formato data URI Base64 (incluyendo prefijo data:image/...)."),
});

const ExtractVoucherOutputSchema = z.object({
  numeroVale: z.string().describe('Número preimpreso del vale.'),
  cliente: z.string().describe('Empresa contratante.'),
  horaInicio: z.string().describe('Hora de inicio.'),
  horaFinal: z.string().describe('Hora de fin.'),
  solicitante: z.string().describe('Quién solicitó el servicio.'),
  centroCostos: z.string().describe('Código de centro de costos.'),
  fecha: z.string().describe('Fecha del servicio.'),
  area: z.string().describe('Departamento/Área.'),
  origen: z.string().describe('Lugar de recogida.'),
  destino: z.string().describe('Lugar de destino.'),
  placa: z.string().describe('Placa del vehículo.'),
  usuarioNombre: z.string().describe('Nombre del pasajero.'),
  usuarioIdentificacion: z.string().describe('Cédula del pasajero.'),
  usuarioCargo: z.string().describe('Cargo del pasajero.'),
  conductor: z.string().describe('Nombre del conductor.'),
  observaciones: z.string().describe('Notas o novedades.'),
});

export type ExtractVoucherOutput = z.infer<typeof ExtractVoucherOutputSchema>;

const voucherPrompt = ai.definePrompt({
  name: 'extractVoucherPrompt',
  input: { schema: ExtractVoucherInputSchema },
  output: { schema: ExtractVoucherOutputSchema },
  prompt: `Eres un experto en digitalización de vales de transporte especial de la empresa Transnova Plus.
Analiza la foto adjunta de una "SOLICITUD DE SERVICIO DE TRANSPORTE".

INSTRUCCIONES DE EXTRACCIÓN:
1. Identifica el número de vale, usualmente preimpreso en color rojo o negro en la parte superior derecha.
2. Extrae los datos escritos a mano con bolígrafo. Sé preciso con nombres y números de identificación.
3. Identifica la placa del vehículo (3 letras y 3 números).
4. Si un dato no es legible debido a la calidad de la foto, devuelve una cadena vacía "". NO inventes datos.
5. Ignora el fondo o los objetos que no pertenezcan al papel del vale.

Imagen del Vale: {{media url=photoDataUri}}`,
});

export async function extractVoucher(photoDataUri: string): Promise<ExtractVoucherOutput> {
  try {
    // Aseguramos que el prefijo del data URI sea correcto
    if (!photoDataUri.startsWith('data:image/')) {
      throw new Error('El formato de la imagen no es válido.');
    }

    const { output } = await voucherPrompt({ photoDataUri });
    
    if (!output) {
      throw new Error('La IA no devolvió resultados legibles.');
    }

    return output;
  } catch (error: any) {
    console.error('Error crítico en IA Vision:', error);
    // Devolvemos un objeto vacío estructurado para no romper la UI y permitir llenado manual
    return {
      numeroVale: '', cliente: '', horaInicio: '', horaFinal: '',
      solicitante: '', centroCostos: '', fecha: '', area: '',
      origen: '', destino: '', placa: '', usuarioNombre: '',
      usuarioIdentificacion: '', usuarioCargo: '', conductor: '', observaciones: '',
    };
  }
}
