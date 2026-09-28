export enum AuthenticationErrorCode {
  MissingUserId = "MISSING_USER_ID",
}

export interface AuthenticationErrorResponse {
  code: AuthenticationErrorCode;
  message: string;
}
