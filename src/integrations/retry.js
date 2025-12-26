/**
 * HTTP fetch with retry logic.
 * Handles rate limits and temporary network errors.
 */
export function fetchWithRetry(url, options, maxTries = 3) {
  const waits = [2000, 5000, 10000];

  for (let t = 0; t < maxTries; t++) {
    try {
      const resp = UrlFetchApp.fetch(url, options);
      const code = resp.getResponseCode();

      if (code === 429 || code === 503 || code === 504) {
        const wait = waits[Math.min(t, waits.length - 1)];
        Utilities.sleep(wait);
        continue;
      }

      return resp;
    } catch (e) {
      const wait = waits[Math.min(t, waits.length - 1)];
      Utilities.sleep(wait);
    }
  }

  return null;
}
