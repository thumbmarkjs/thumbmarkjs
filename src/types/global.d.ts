interface ApplePaySession {
  new(version: number, paymentRequest: any): ApplePaySession;
  canMakePayments(): boolean;
  supportsVersion(version: number): boolean;
}

interface Window {
    webkitOfflineAudioContext: typeof OfflineAudioContext
    webkitAudioContext: typeof AudioContext
    ApplePaySession: typeof ApplePaySession
  }

interface Navigator {
  deviceMemory?: number,
}