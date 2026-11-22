'use server';
/**
 * @fileOverview Flujo de IA optimizado para la lectura de vales Transnova Plus.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractVoucherInputSchema = z.object({
  photoDataUri: z.string().describe("Imagen del vale en formato data URI Base64."),
});

const ExtractVoucherOutputSchema = z.object({
  numero_vale: z.string().describe('El número rojo arriba a la derecha.'),
  cliente: z.string().describe('Nombre de la empresa o cliente (ej. Marcopolo).'),
  fecha: z.string().describe('Fecha del servicio.'),
  hora_inicio: z.string().describe('Hora de inicio.'),
  hora_final: z.string().describe('Hora de finalización.'),
  solicitante: z.string().describe('Persona que pide el servicio.'),
  centro_costos: z.string().describe('Número del centro de costos.'),
  origen: z.string().describe('Lugar de recogida.'),
  destino: z.string().describe('Lugar de destino.'),
  placa: z.string().describe('Placa del carro (ej. WPO 374).'),
  conductor: z.string().describe('Nombre del conductor.'),
  usuarios: z.string().describe('Nombres y documentos de los pasajeros.'),
  valor: z.string().describe('Valor total del servicio.'),
  observaciones: z.string().describe('Notas o detalles adicionales.'),
});

export type ExtractVoucherOutput = z.infer<typeof ExtractVoucherOutputSchema>;

const voucherPrompt = ai.definePrompt({
  name: 'extractVoucherPrompt',
  input: { schema: ExtractVoucherInputSchema },
  output: { schema: ExtractVoucherOutputSchema },
  prompt: `Analiza este vale de "Transnova Plus" con extrema atención. 
Es un formulario de transporte especial.

Busca estos datos específicos:
1. **Número de Vale**: Es el número impreso en color ROJO en la esquina superior derecha.
2. **Cliente/Empresa**: Suele ser "Marcopolo" o similar.
3. **Solicitante**: Persona que firma o solicita el servicio.
4. **Centro de Costos**: Código numérico de la empresa.
5. **Placa**: Formato de 3 letras y 3 números (ej. WPO 374).
6. **Conductor**: Nombre del chofer asignado.
7. **Ruta**: Lee con cuidado el "Origen" y el "Destino".
8. **Usuarios**: Tabla central con nombres y cédulas.

Si no ves un dato claramente, deja el campo vacío "", NO inventes nada.

Imagen: {{media url=photoDataUri}}`,
});

export async function extractVoucher(photoDataUri: string): Promise<ExtractVoucherOutput> {
  try {
    const { output } = await voucherPrompt({ photoDataUri });
    if (!output) {
      throw new Error('La IA no pudo procesar la imagen correctamente.');
    }
    return output;
  } catch (error: any) {
    console.error('Error en el flujo de extracción:', error);
    throw new Error('No se pudo leer el vale. Asegúrate de que la foto tenga buena luz y se vea todo el papel.');
  }
}
