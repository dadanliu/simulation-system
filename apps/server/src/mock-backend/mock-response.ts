export type MockSuccessResponse<T> = {
  errno: 0;
  errmsg: "";
  data: T;
};

export type MockBusinessErrorResponse = {
  errno: number;
  errmsg: string;
  data: null;
};

export type MockResponse<T> =
  | MockSuccessResponse<T>
  | MockBusinessErrorResponse;

export function mockSuccess<T>(data: T): MockSuccessResponse<T> {
  return {
    errno: 0,
    errmsg: "",
    data
  };
}

export function mockBusinessError(
  errno: number,
  errmsg: string
): MockBusinessErrorResponse {
  return {
    errno,
    errmsg,
    data: null
  };
}
