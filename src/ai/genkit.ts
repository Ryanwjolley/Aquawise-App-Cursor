/**
 * @fileoverview This file initializes the Genkit AI platform with the Google AI plugin.
 * It exports a single `ai` object that is used throughout the application to
 * interact with generative models.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import 'dotenv/config';

export const ai = genkit({
  plugins: [
    firebase(),
    googleAI({
      // The Gemini 1.5 Pro model is in public preview.
      // We must specify the API version to use it.
      apiVersion: 'v1beta',
    }),
  ],
  // Log all traces to the console.
  traceStore: 'firebase',
  // Log all flow states to the console.
  flowStateStore: 'firebase',
  // Cache all model responses to the console.
  cacheStore: 'firebase',
  // Log to the console.
  logLevel: 'debug',
  // Disable telemtry.
  enableTelemetry: false,
});
