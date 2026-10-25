export class CheckError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "CheckError";
    this.status = status;
    this.code = code;
  }
}
