
import crypto from 'crypto';

/**
 * Verifies the signature of a Cashfree webhook request.
 * @param rawBody The raw, unparsed request body string.
 * @param signature The value of the 'x-webhook-signature' header.
 * @param timestamp The value of the 'x-webhook-timestamp' header.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  const secretKey = process.env.CASHFREE_PAYMENTS_CLIENT_SECRET;

  if (!secretKey) {
    console.error('Cashfree secret key is not configured for webhook verification.');
    return false;
  }

  try {
    const signatureData = `${timestamp}${rawBody}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureData)
      .digest('base64');
    
    // Use timing-safe comparison to prevent timing attacks
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    return isSignatureValid;

  } catch (error) {
    console.error('Error during webhook signature verification:', error);
    return false;
  }
}
