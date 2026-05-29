import crypto from "crypto";

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  secret: string;
}

// In-memory store for demonstration. In production, this would be a database.
let webhooks: WebhookRegistration[] = [];

export function registerWebhook(url: string, events: string[], secret?: string): WebhookRegistration {
  const newWebhook: WebhookRegistration = {
    id: crypto.randomUUID(),
    url,
    events,
    createdAt: new Date().toISOString(),
    secret: secret || crypto.randomBytes(32).toString('hex'),
  };
  webhooks.push(newWebhook);
  return newWebhook;
}

export function verifyWebhookSignature(payload: string, secret: string, signature: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}

export function unregisterWebhook(id: string): boolean {
  const initialLength = webhooks.length;
  webhooks = webhooks.filter((w) => w.id !== id);
  return webhooks.length < initialLength;
}

export function getWebhooks(): WebhookRegistration[] {
  return [...webhooks];
}

export async function triggerWebhooks(eventName: string, payload: any) {
  const targets = webhooks.filter((w) => w.events.includes(eventName) || w.events.includes("*"));
   
  const results = await Promise.allSettled(
    targets.map(async (webhook) => {
      try {
        const timestamp = new Date().toISOString();
        const bodyPayload = { event: eventName, payload, timestamp };
        const body = JSON.stringify(bodyPayload);
        
        const signature = crypto.createHmac('sha256', webhook.secret)
          .update(body)
          .digest('hex');
        
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Stellar-Batch-Pay-Event": eventName,
            "x-webhook-signature": signature,
          },
          body,
        });
        return { id: webhook.id, success: response.ok, status: response.status };
      } catch (error) {
        return { id: webhook.id, success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    })
  );

  return results;
}
