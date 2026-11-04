export const retryError = (message = "not_ready") => {
  return Object.assign(new Error(message), {
    retryable: true,
  });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const retryUntilReady = async (fn, times = 5, delay = 200) => {
  let lastErr;

  for (let i = 0; i < times; i++) {
    try {
      const res = await fn();
      return res;
    } catch (err) {
      lastErr = err;

      if (err?.retryable) {
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }

  throw lastErr;
};
