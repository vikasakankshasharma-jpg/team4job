
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';

// Only initialize real Genkit in production (not in CI/test mode)
const isCI = process.env.NEXT_PUBLIC_IS_CI === 'true';

export const ai: any = isCI ? {
  // Minimal mock to prevent crashes in CI/test
  definePrompt: () => ({}),
  defineFlow: () => {
    const flow = (input: any) => Promise.resolve({ success: true, data: {} });
    (flow as any).run = flow;
    return flow;
  },
  generate: () => Promise.resolve({ text: () => "Mocked Response" }),
  defineSchema: (name: string, schema: any) => schema,
  embed: () => Promise.resolve([0.1, 0.2, 0.3]), // Mock embedding
} : genkit({
  plugins: [
    // Google AI for generative models (Gemini)
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
    // Vertex AI for embeddings
    vertexAI({
      projectId: 'dodo-beta',
      location: 'us-central1',
      // Use service account credentials in Firebase Functions, ADC locally
      ...(process.env.VERTEX_AI_CREDENTIALS ? {
        googleAuth: {
          credentials: JSON.parse(process.env.VERTEX_AI_CREDENTIALS)
        }
      } : {})
    }),
  ],
});

import { aiMetricsService } from '@/ai/services/AIMetricsService';

/**
 * Wraps ai.defineFlow to automatically log inputs, outputs, and performance metrics.
 */
import { aiCacheService } from '@/ai/services/AICacheService';

/**
 * Wraps ai.defineFlow to automatically log inputs, outputs, and performance metrics.
 * Now supports optional caching.
 */
// Update signature to accept any number of arguments (input, context, streamingCallback)
export const defineLoggedFlow = (config: any, fn: (input: any, ...args: any[]) => Promise<any>) => {
  return ai.defineFlow(config, async (input: any, ...args: any[]) => {
    const startTime = performance.now();
    let success = true;
    let error: any = undefined;
    let cachedHit = false;
    const name = config.name || 'anonymous_flow';

    // MODEL ROUTER: Select model based on tier
    const modelTier = config.modelTier || 'flash'; // Default to cost-effective Flash
    const modelVersion = modelTier === 'pro' ? 'gemini-2.0-flash' : 'gemini-1.5-flash';

    // CACHE CHECK (Only use cache if no streaming/extra args, to be safe for now, or just ignore args for cache key)
    // For now, we only cache based on input.
    if (config.cacheConfig?.enabled) {
      try {
        const cached = await aiCacheService.get(name, input, modelVersion);
        if (cached) {
          // HIT! Return instantly
          cachedHit = true;

          // Still log the interaction but as a cache hit (faster, cheaper)
          aiMetricsService.logInteraction({
            timestamp: new Date(),
            flowName: name,
            modelVersion,
            latencyMs: Math.round(performance.now() - startTime),
            success: true,
            costUsd: 0, // Cache hits are free!
            cacheHit: true
          }).catch(e => console.error(`[AI] Log cache hit failed:`, e));

          return cached.output;
        }
      } catch (e) {
        console.warn(`[AI] Cache lookup failed for ${name}:`, e);
      }
    }

    // RATE LIMIT CHECK
    if (config.rateLimitConfig?.enabled && input.userId) { // rate limit requires userId
      try {
        // Lazy load to avoid circular deps if any, though service is standalone
        const { aiRateLimitService } = await import('@/ai/services/AIRateLimitService');
        const limitAction = config.rateLimitConfig.limitTypeAction || 'ai_chat';

        const check = await aiRateLimitService.checkLimit(input.userId, limitAction);
        if (!check.allowed) {
          throw new Error(check.reason || "Rate limit exceeded.");
        }
      } catch (e) {
        if ((e as Error).message.includes("Rate limit exceeded")) throw e;
        console.warn(`[AI] Rate limit check failed for ${name}:`, e);
        // Fail open
      }
    }

    try {
      // Pass all arguments through to the original function
      const result = await fn(input, ...args);

      // CACHE SET
      if (config.cacheConfig?.enabled && success) {
        aiCacheService.set(
          name,
          input,
          modelVersion,
          result,
          config.cacheConfig.ttlSeconds
        ).catch(e => console.warn(`[AI] Cache set failed:`, e));
      }

      // RATE LIMIT INCREMENT
      if (config.rateLimitConfig?.enabled && input.userId) {
        const { aiRateLimitService } = await import('@/ai/services/AIRateLimitService');
        const limitAction = config.rateLimitConfig.limitTypeAction || 'ai_chat';
        aiRateLimitService.incrementUsage(input.userId, limitAction, 1).catch(e => console.error(`[AI] Rate limit increment failed:`, e));
      }

      return result;
    } catch (err: any) {
      success = false;
      error = err;
      throw err;
    } finally {
      if (!cachedHit) {
        const duration = performance.now() - startTime;

        // Fire-and-forget logging to avoid blocking the response
        aiMetricsService.logInteraction({
          timestamp: new Date(),
          flowName: name,
          modelVersion,
          latencyMs: Math.round(duration),
          success,
          errorType: error?.name || (error ? 'UnknownError' : undefined),
          errorMessage: error?.message || (error ? String(error) : undefined),
          cacheHit: false
        }).catch(e => {
          // Fail silently in production, log in dev
          if (process.env.NODE_ENV === 'development') {
            console.error(`[AI] Failed to log interaction for ${name}:`, e);
          }
        });
      }
    }
  });
};
