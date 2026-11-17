/**
 * Monster Design Room button rules (pure): the order is 1) make the image (bioreactor), 2) send to the arena.
 * - No image yet: only the bioreactor can be started.
 * - Image exists (generated or uploaded): only the arena launch is enabled.
 * - While a job runs both are disabled.
 */
export interface DesignRoomButtonState {
  incubateEnabled: boolean;
  deployEnabled: boolean;
}
export function designRoomButtonState(input: { hasImage: boolean; isBusy: boolean }): DesignRoomButtonState {
  const { hasImage, isBusy } = input;
  return { incubateEnabled: !hasImage && !isBusy, deployEnabled: hasImage && !isBusy };
}