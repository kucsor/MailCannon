'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateMessageInputSchema = z.object({
  message: z.string().describe('The message to translate from Romanian to German.'),
});
export type TranslateMessageInput = z.infer<typeof TranslateMessageInputSchema>;

const TranslateMessageOutputSchema = z.object({
  translatedMessage: z.string().describe('The translated message in German.'),
});
export type TranslateMessageOutput = z.infer<typeof TranslateMessageOutputSchema>;

export async function translateMessage(input: TranslateMessageInput): Promise<TranslateMessageOutput> {
  return translateMessageFlow(input);
}

const translateMessagePrompt = ai.definePrompt({
  name: 'translateMessagePrompt',
  input: {schema: TranslateMessageInputSchema},
  output: {schema: TranslateMessageOutputSchema},
  prompt: `You are an expert translator. Translate the following message from Romanian to German.
      Ensure the tone is appropriate for a professional job application or cover letter.
      Return only the translated text.

      Message: {{{message}}}`,
});

const translateMessageFlow = ai.defineFlow(
  {
    name: 'translateMessageFlow',
    inputSchema: TranslateMessageInputSchema,
    outputSchema: TranslateMessageOutputSchema,
  },
  async input => {
    const {output} = await translateMessagePrompt(input);
    return output!;
  }
);
