interface ApplePaySession {
  new(version: number, paymentRequest: any): ApplePaySession;
  canMakePayments(): boolean;
  supportsVersion(version: number): boolean;
}

interface Window {
    webkitAudioContext: typeof AudioContext
    webkitOfflineAudioContext: typeof OfflineAudioContext
    ApplePaySession: typeof ApplePaySession
  }

interface Navigator {
  deviceMemory?: number,
}