declare module "sharp" {
  type SharpInput = Buffer | Uint8Array | {
    create: {
      width: number;
      height: number;
      channels: 3 | 4;
      background: string;
    };
  };

  type SharpOptions = {
    failOn?: "none" | "truncated" | "error" | "warning";
    limitInputPixels?: number | boolean;
    sequentialRead?: boolean;
  };

  type SharpInstance = {
    rotate(): SharpInstance;
    clone(): SharpInstance;
    resize(options: Record<string, unknown>): SharpInstance;
    webp(options?: Record<string, unknown>): SharpInstance;
    jpeg(options?: Record<string, unknown>): SharpInstance;
    withMetadata(options?: Record<string, unknown>): SharpInstance;
    toBuffer(options: { resolveWithObject: true }): Promise<{
      data: Buffer;
      info: { width: number; height: number };
    }>;
    toBuffer(): Promise<Buffer>;
    metadata(): Promise<{
      format?: string;
      exif?: Buffer;
      orientation?: number;
    }>;
  };

  function sharp(input: SharpInput, options?: SharpOptions): SharpInstance;
  export default sharp;
}
