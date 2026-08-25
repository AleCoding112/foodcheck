/** L'API BarcodeDetector non e' ancora nelle definizioni standard di TypeScript.
 *  Dichiariamo il minimo che ci serve: la usiamo dove c'è, altrimenti si passa
 *  al decodificatore in JavaScript. */
declare global {
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

  interface MediaTrackCapabilities {
    torch?: boolean
  }

  interface MediaTrackConstraintSet {
    torch?: boolean
  }
}

export {}
