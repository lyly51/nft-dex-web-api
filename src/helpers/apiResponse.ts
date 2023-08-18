export class ApiResponse {
  constructor(private code: number) {}
  private data: any;
  private errorMessage: string;

  setData(data: any): ApiResponse {
    this.data = data;
    return this;
  }

  setErrorMessage(msg: string): ApiResponse {
    this.errorMessage = msg;
    return this;
  }

  toObject() {
    return {
      code: this.code,
      data: this.data,
      errorMessage: this.errorMessage,
    };
  }
}

export enum ResponseStatus {
  Success = 0,
  Failure = 1,
  UsernameWrong = -4
}
