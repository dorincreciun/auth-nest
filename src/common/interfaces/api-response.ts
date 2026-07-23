type BaseResponseInfo = {
  statusCode: number;
  timestamp: string;
  path: string;
};

export type ErrorResponse = BaseResponseInfo & {
  success: false;
  message: string[];
  error: string;
};

export type SuccessResponse<T> = BaseResponseInfo & {
  success: true;
  data: T;
};

export type ApiResponse<T> = ErrorResponse | SuccessResponse<T>;
