import { readFileSync } from 'fs';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Load environment variables from .env.local
try {
  const envFile = readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
} catch (error) {
  console.log('No .env.local file found or error reading it');
}

const model = openai('gpt-4o-mini'); // Changed from gpt-5 to available model

export const answerMyQuestion = async (prompt) => {
  const { text } = await generateText({
    model,
    prompt,
  });
  return text;
};

// Main function to run the test
async function main() {
  try {
    const answer = await answerMyQuestion('What is the capital of France?');
    console.log(answer); // Should print "The capital of France is Paris."
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run it
main();
