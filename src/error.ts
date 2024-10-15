export type ApiError = {
  detail?: {
    msg: string;
    type: string;
    loc: string[];
  }[];
};

export type SearchALiciousError = {
  error: {
    statusCode: number;
    message: string;
    details?: any;
  };
};