export type MonaHumanDelayOptions = {
  minimumMs?: number;
  maximumMs?: number;
  messageLength?: number;
};

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function randomBetween(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

export function calculateMonaHumanDelay(
  options: MonaHumanDelayOptions = {}
) {
  const minimumMs = Math.max(0, options.minimumMs ?? 1800);
  const maximumMs = Math.max(minimumMs, options.maximumMs ?? 4200);

  const messageLength = Math.max(0, options.messageLength ?? 0);

  const lengthAdjustment =
    messageLength > 500
      ? 1200
      : messageLength > 250
        ? 700
        : messageLength > 100
          ? 350
          : 0;

  return randomBetween(
    minimumMs,
    maximumMs + lengthAdjustment
  );
}

export async function waitForMonaHumanDelay(
  options: MonaHumanDelayOptions = {}
) {
  const delayMs = calculateMonaHumanDelay(options);

  await sleep(delayMs);

  return delayMs;
}
