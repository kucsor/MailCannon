'use server';

/**
 * @fileOverview This file defines a Genkit flow for improving a draft email message using AI.
 *
 * The flow accepts a draft email message as input and uses a language model to improve it.
 * It corrects grammar, refines the tone, and suggests better wording.
 *
 * @param {ImproveDraftMessageInput} input - The input to the improveDraftMessage function.
 * @returns {Promise<ImproveDraftMessageOutput>} - A promise that resolves with the improved email message.
 *
 * @exported improveDraftMessage - An async function that calls the flow with the input and returns the output.
 * @exported ImproveDraftMessageInput - The input type for the improveDraftMessage function.
 * @exported ImproveDraftMessageOutput - The return type for the improveDraftMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveDraftMessageInputSchema = z.object({
  draftMessage: z.string().describe('The draft email message to improve.'),
});
export type ImproveDraftMessageInput = z.infer<typeof ImproveDraftMessageInputSchema>;

const ImproveDraftMessageOutputSchema = z.object({
  improvedMessage: z
    .string()
    .describe('The improved email message with better grammar, tone, and wording.'),
});
export type ImproveDraftMessageOutput = z.infer<typeof ImproveDraftMessageOutputSchema>;

export async function improveDraftMessage(input: ImproveDraftMessageInput): Promise<ImproveDraftMessageOutput> {
  return improveDraftMessageFlow(input);
}

const improveDraftMessagePrompt = ai.definePrompt({
  name: 'improveDraftMessagePrompt',
  input: {schema: ImproveDraftMessageInputSchema},
  output: {schema: ImproveDraftMessageOutputSchema},
  prompt: `You are an AI assistant that helps improve email messages.
      Please review the following draft email message and improve its grammar, tone, and wording.
      Return the improved message.

      Draft Message: {{{draftMessage}}} `,
});

const improveDraftMessageFlow = ai.defineFlow(
  {
    name: 'improveDraftMessageFlow',
    inputSchema: ImproveDraftMessageInputSchema,
    outputSchema: ImproveDraftMessageOutputSchema,
  },
  async input => {
    const {output} = await improveDraftMessagePrompt(input);
    return output!;
  }
);
