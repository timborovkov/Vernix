declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(params: {
    data: Uint8Array;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(num: number): Promise<{
        getTextContent(): Promise<{
          items: Array<{ str: string } | Record<string, unknown>>;
        }>;
      }>;
    }>;
  };
}
