export interface ApiIssue {
  path: string;
  message: string;
}

export type ApiFieldErrors = Record<string, string[]>;

export interface ApiSuccessEnvelope<T> {
  ok: true;
  data: T;
}

export interface ApiFailureEnvelope {
  ok: false;
  error: string;
  issues?: ApiIssue[];
  fieldErrors?: ApiFieldErrors;
  errorCode?: string;
  [key: string]: unknown;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiFailureEnvelope;
