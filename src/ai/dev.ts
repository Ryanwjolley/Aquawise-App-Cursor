import { config } from 'dotenv';
config({ path: '.env' });

// Import flows so that they are registered with Genkit.
import './flows/generate-notification-message';
import './flows/test-email-flow';
