// The `qrcode` package ships no types; this covers the one call the site makes.
declare module "qrcode" {
  export type QRCodeToStringOptions = {
    type?: "svg" | "utf8" | "terminal";
    margin?: number;
    width?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: { dark?: string; light?: string };
  };
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  export function toString(
    text: string,
    options: QRCodeToStringOptions,
    cb: (err: Error | null | undefined, svg: string) => void,
  ): void;
}
