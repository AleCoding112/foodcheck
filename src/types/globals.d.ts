/** L'API BarcodeDetector non e' ancora nelle definizioni standard di TypeScript.
 *  Dichiariamo il minimo che ci serve: la usiamo dove c'è, altrimenti si passa
 *  al decodificatore in JavaScript. */
declare global {
  /** Data e ora della compilazione, inserita da Vite. */
  const __VERSIONE__: string

  interface DetectedBarcode {
    rawValue: string
    format: string
    boundingBox: DOMRectReadOnly
  }

  class BarcodeDetector {
    constructor(options?: { formats?: string[] })
    static getSupportedFormats(): Promise<string[]>
    detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
  }

  interface HTMLVideoElement {
    /** Chiama la funzione quando un fotogramma viene davvero presentato a
     *  schermo. Presente in Safari dalla 15.4 e in Chrome. */
    requestVideoFrameCallback?(callback: (now: number, metadata: unknown) => void): number
    cancelVideoFrameCallback?(handle: number): void
  }

  interface MediaTrackCapabilities {
    torch?: boolean
  }

  interface MediaTrackConstraintSet {
    torch?: boolean
  }
}

export {}
