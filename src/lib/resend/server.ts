import { Resend } from "resend";

let client: Resend | null = null;

// No RESEND_API_KEY yet (still setting up domain verification)? Callers treat null as
// "skip sending" rather than failing — the contact form keeps working, saved to the database
// either way, and notifications start flowing the moment the key is added. No other code
// changes needed once that happens.
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}
