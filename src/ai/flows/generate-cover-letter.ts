'use server';

/**
 * @fileOverview AI-powered cover letter generation flow.
 *
 * This file defines a Genkit flow that generates a cover letter based on a user-provided CV and job description.
 *
 * - `generateCoverLetter`: Asynchronous function to trigger the cover letter generation flow.
 * - `GenerateCoverLetterInput`: Interface defining the input schema for the flow.
 * - `GenerateCoverLetterOutput`: Interface defining the output schema for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCoverLetterInputSchema = z.object({
  cv: z
    .string()
    .describe("The applicant's CV or resume text content."),
  jobDescription: z.string().describe('The job description for the position.'),
  tone: z
    .string()
    .optional()
    .describe('The tone of cover letter, e.g., formal, informal, enthusiastic. Defaults to neutral.'),
  additionalInstructions: z
    .string()
    .optional()
    .describe('Any additional instructions for generating the cover letter.'),
});

export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterInputSchema>;

const GenerateCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated cover letter.'),
});

export type GenerateCoverLetterOutput = z.infer<typeof GenerateCoverLetterOutputSchema>;

export async function generateCoverLetter(input: GenerateCoverLetterInput): Promise<GenerateCoverLetterOutput> {
  return generateCoverLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCoverLetterPrompt',
  input: {schema: GenerateCoverLetterInputSchema},
  output: {schema: GenerateCoverLetterOutputSchema},
  prompt: `You are an AI assistant designed to generate cover letters based on a CV and a job description.

CV:
{{cv}}

Job Description:
{{jobDescription}}

Additional Instructions:
{{additionalInstructions}}

Instructions: Use the CV and job description to generate a cover letter that is tailored to the position. The cover letter should be professional and highlight the applicant's skills and experience that are relevant to the job.  The tone should be {{tone}}.

Cover Letter:`, // Fixed the typo here.
});

const generateCoverLetterFlow = ai.defineFlow(
  {
    name: 'generateCoverLetterFlow',
    inputSchema: GenerateCoverLetterInputSchema,
    outputSchema: GenerateCoverLetterOutputSchema,
  },
  async input => {
    const {output} = await prompt({
      ...input,
      tone: input.tone ?? 'neutral',
    });
    return output!;
  }
);
