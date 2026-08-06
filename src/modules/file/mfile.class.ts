export class MFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;

  public constructor(file: Express.Multer.File | MFile) {
    this.buffer = file.buffer;
    this.mimetype = file.mimetype;
    this.originalname = file.originalname;
  }
}
