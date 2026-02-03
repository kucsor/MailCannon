
import { ai } from '../src/ai/genkit';
import * as dotenv from 'dotenv';
import path from 'path';

// Try to load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('--- Verifying Genkit Environment ---');

  // Check for API Key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (apiKey) {
    console.log('✅ API Key found in environment variables (GEMINI_API_KEY or GOOGLE_GENAI_API_KEY).');
    console.log(`   Key length: ${apiKey.length}`);
    console.log(`   Key starts with: ${apiKey.substring(0, 4)}...`);
  } else {
    console.error('❌ API Key NOT found. Please set GEMINI_API_KEY in your environment variables.');
    // Don't exit yet, let genkit try (it might have internal loading mechanisms)
  }

  // Test Connection
  console.log('\n--- Testing Gemini Connection ---');
  try {
    const prompt = 'Hello, this is a connection test. Please reply with "Connection Successful".';
    console.log(`Sending prompt: "${prompt}"`);

    // We assume the default model is configured in src/ai/genkit.ts
    const { text } = await ai.generate(prompt);

    console.log(`\n✅ Response received: "${text}"`);
    console.log('Genkit connection verified successfully!');
  } catch (error: any) {
    console.error('\n❌ Connection Failed!');
    console.error('Error details:', error.message);
    if (error.status) console.error('Status Code:', error.status);
    process.exit(1);
  }
}

main().catch(console.error);
