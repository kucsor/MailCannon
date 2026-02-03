'use server';

/**
 * @fileOverview AI flow to generate a personalized job application based on recipient email, CV, and other details.
 *
 * - `generatePersonalizedApplication`: Triggers the application generation flow.
 * - `GeneratePersonalizedApplicationInput`: Input schema for the flow.
 * - `GeneratePersonalizedApplicationOutput`: Output schema for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {parseResume} from '@/lib/parse-resume';

// Schema for the AI Flow (Internal)
const GeneratePersonalizedApplicationInputSchema = z.object({
  recipientEmail: z.string().email().describe("The email address of the recipient."),
  cv: z.string().describe("The applicant's CV text content."),
  jobDescription: z.string().optional().describe('The job description for the position, if available.'),
  personalNotes: z.string().optional().describe('Any personal notes or preferences to include, like desired work hours or family considerations.'),
});

export type GeneratePersonalizedApplicationInput = z.infer<typeof GeneratePersonalizedApplicationInputSchema>;

const GeneratePersonalizedApplicationOutputSchema = z.object({
  subject: z.string().describe("The generated subject line for the email."),
  message: z.string().describe("The generated body of the email."),
});

export type GeneratePersonalizedApplicationOutput = z.infer<typeof GeneratePersonalizedApplicationOutputSchema>;

// Schema for the Server Action (Public) - allows file upload or raw text
const ActionInputSchema = z.object({
  recipientEmail: z.string().email(),
  cv: z.string().optional(),
  cvFile: z.string().optional(), // base64 string
  cvMimeType: z.string().optional(),
  jobDescription: z.string().optional(),
  personalNotes: z.string().optional(),
});

export type GeneratePersonalizedApplicationActionInput = z.infer<typeof ActionInputSchema>;

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function generatePersonalizedApplication(input: GeneratePersonalizedApplicationActionInput): Promise<ActionResponse<GeneratePersonalizedApplicationOutput>> {
  console.log('generatePersonalizedApplication called');

  try {
    let cvText = input.cv;

    if (!cvText && input.cvFile && input.cvMimeType) {
      try {
        console.log('Converting base64 to buffer...');
        const buffer = Buffer.from(input.cvFile, 'base64');
        console.log('Buffer created, size:', buffer.length);

        console.log('Calling parseResume...');
        cvText = await parseResume(buffer, input.cvMimeType);
        console.log('CV parsed successfully. Text length:', cvText.length);
      } catch (error: any) {
        console.error("Error parsing CV file:", error);
        return { success: false, error: `Failed to extract text from the attached CV: ${error.message}` };
      }
    }

    if (!cvText) {
        return { success: false, error: "CV content is required. Please provide cv text or a valid file." };
    }

    // Truncate CV text if it's too long to prevent token limit issues
    const MAX_CV_LENGTH = 100000; // ~100k characters (approx 25k tokens) should be plenty
    if (cvText.length > MAX_CV_LENGTH) {
        console.warn(`CV text is too long (${cvText.length} chars). Truncating to ${MAX_CV_LENGTH}.`);
        cvText = cvText.substring(0, MAX_CV_LENGTH) + "\n...[Truncated]";
    }

    console.log('Calling AI flow...');
    // Call the flow with the extracted text
    const result = await generatePersonalizedApplicationFlow({
        recipientEmail: input.recipientEmail,
        cv: cvText,
        jobDescription: input.jobDescription,
        personalNotes: input.personalNotes
    });
    console.log('AI flow completed successfully.');

    return { success: true, data: result };

  } catch (error: any) {
    console.error('CRITICAL ERROR in generatePersonalizedApplication:', error);
    if (error.stack) console.error(error.stack);

    // Return a structured error that the client can display
    // We try to extract a meaningful message
    let errorMessage = "An unexpected error occurred during AI generation.";

    if (error.message) {
        if (error.message.includes("400")) {
             // Handle common API key or bad request issues nicely
             errorMessage = "AI Service Error: The request was rejected. Please check your API key configuration.";
        } else {
             errorMessage = error.message;
        }
    }

    return { success: false, error: errorMessage };
  }
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedApplicationPrompt',
  input: {schema: GeneratePersonalizedApplicationInputSchema},
  output: {schema: GeneratePersonalizedApplicationOutputSchema},
  prompt: `You are a professional career assistant. Your task is to write a job application email, including a subject and a message.

Analyze the recipient's email address: {{recipientEmail}} to infer the company they work for using your knowledge.

**Scenario 1: If you can identify the company from the email domain.**
- Write a cover letter tailored to that company.
- Use the provided CV to highlight relevant skills and experience.
- If a job description is provided, focus on how the applicant matches the requirements.
- Weave in the personal notes provided by the user in a professional and subtle way. For example, frame preferences like working hours as a point for discussion rather than a rigid demand.

**Scenario 2: If you CANNOT identify the company from the email domain.**
- Write a more general, adaptable cover letter.
- State that the applicant is very interested in opportunities and is eager for a career change.
- Mention that the CV is attached for their review.
- Incorporate the user's personal notes professionally. For instance, phrase preferences (like night shifts) as a flexible desire and mention awareness of long-term planning needs (like school holidays) to show responsibility.

**User-provided Information:**
- CV:
{{{cv}}}

- Job Description (if any):
{{{jobDescription}}}

- Personal Notes to include:
{{{personalNotes}}}

Generate an appropriate subject and the full message for the email. The tone should be professional and authentic.
`,
});

const generatePersonalizedApplicationFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedApplicationFlow',
    inputSchema: GeneratePersonalizedApplicationInputSchema,
    outputSchema: GeneratePersonalizedApplicationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
