import { loadEnvConfig } from '@next/env';
import path from 'path';
import { ai } from '../src/ai/genkit';

// Load environment variables using Next.js logic (supports .env.local, .env, etc.)
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log("----------------------------------------");
  console.log("🔍 Testing AI Connection");
  console.log("----------------------------------------");

  // Check for supported environment variables based on Genkit Google AI plugin
  const geminiKey = process.env.GEMINI_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const googleGenAiKey = process.env.GOOGLE_GENAI_API_KEY;

  console.log(`Checking Environment Variables:`);
  console.log(`- GEMINI_API_KEY: ${geminiKey ? '✅ Set' : '❌ Missing'} ${geminiKey?.startsWith('your_') ? '(⚠️ Looks like a placeholder)' : ''}`);
  console.log(`- GOOGLE_API_KEY: ${googleKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`- GOOGLE_GENAI_API_KEY: ${googleGenAiKey ? '✅ Set' : '❌ Missing'}`);

  if (!geminiKey && !googleKey && !googleGenAiKey) {
    console.error("\n❌ No API key found. Please set GEMINI_API_KEY in your environment or .env.local file.");
    process.exit(1);
  }

  try {
    console.log("\n📡 Attempting to connect to Google GenAI...");
    const result = await ai.generate({
      prompt: 'Hello! Just reply with "Connection successful!".',
    });
    console.log("\n✅ Success! Response from AI:");
    console.log(`"${result.text}"`);
  } catch (error: any) {
    console.error("\n❌ Connection Failed:");
    if (error.message && error.message.includes("API key not valid")) {
       console.error("The API key provided is invalid. Please check your Vercel settings or .env file.");
    } else {
       console.error(error.message || error);
    }
    process.exit(1);
  }
}

main();
