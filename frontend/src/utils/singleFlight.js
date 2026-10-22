// Share concurrent requests for the same operation, but allow later retries
// and deliberate new requests after the current operation settles.
export function createSingleFlight() {
  const pending = new Map();
  return (key, operation) => {
    if (pending.has(key)) return pending.get(key);
    const request = Promise.resolve().then(operation).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };
}
