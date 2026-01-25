// Suppress jsdom "Not implemented" warnings for APIs that Thumbmark handles gracefully
const originalError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('Not implemented: HTMLCanvasElement.prototype.getContext')) return;
  if (message.includes('Not implemented: HTMLCanvasElement')) return;
  originalError.call(console, ...args);
};
