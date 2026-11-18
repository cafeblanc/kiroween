/**
 * Monster image generation through HuggingFace (shared by the browser service and the /api/generate-image route).
 * No browser APIs here, so the serverless function can import it.
 */

/** hf-inference model (FLUX.1-schnell there now answers 410 Gone). */
export const HF_IMAGE_MODEL = "stabilityai/stable-diffusion-3-medium-diffusers";
export const HF_IMAGE_URL = `https://router.huggingface.co/hf-inference/models/${HF_IMAGE_MODEL}`;
export const HF_IMAGE_SIZE_PX = 1024;

/**
 * Things the image must not contain (negative_prompt). Image models draw what a prompt names even after "no" or
 * "without", so absence is asked for here and the descriptions stay positive.
 */
export const IMAGE_NEGATIVE_PROMPT =
  "text, letters, words, watermark, logo, signature, blurry, low quality, cropped body, cut off head, cut off feet, two creatures, multiple creatures, human spectators, frame, border";

export const MAX_IMAGE_PROMPT_CHARS = 1500;

/** Server cost guard: images per IP per UTC day (the HF free credit is small). */
export const HF_IMAGE_DAILY_CAP = 15;

/** Pure: the hf-inference request body. Seed is clamped to a non-negative 32-bit integer. */
export function hfImageRequestBody(prompt: string, seed: number): string {
  const s = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) % 2_147_483_647 : 0;
  return JSON.stringify({
    inputs: prompt,
    parameters: {
      seed: s,
      width: HF_IMAGE_SIZE_PX,
      height: HF_IMAGE_SIZE_PX,
      negative_prompt: IMAGE_NEGATIVE_PROMPT,
    },
  });
}
