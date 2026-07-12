export function createSingleFlight<T>() {
  let inFlight: Promise<T> | null = null;

  return (operation: () => Promise<T>) => {
    if (!inFlight) {
      inFlight = operation().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}
