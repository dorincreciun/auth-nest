export type MFileInput = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

/**
 * Wrapper ușor peste fișierele din memorie (Multer / transformări Sharp).
 */
export class MFile {
  public readonly buffer: Buffer;
  public readonly originalname: string;
  public readonly mimetype: string;

  public constructor(file: MFileInput) {
    this.buffer = file.buffer;
    this.originalname = file.originalname;
    this.mimetype = file.mimetype;
  }
}
