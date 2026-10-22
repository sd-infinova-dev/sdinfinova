// Cloudflare Workers & Pages Functions Type Definitions
// Explicitly scoped to avoid global lib.dom.d.ts conflicts with React

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: any;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: Record<string, any>;
  customMetadata?: Record<string, string>;
  writeHttpMetadata?(headers: Headers): void;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: {
      httpMetadata?: {
        contentType?: string;
        contentLanguage?: string;
        contentDisposition?: string;
        contentEncoding?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: any): Promise<any>;
}

export type CloudflareEnv = {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  ASSETS?: {
    fetch: (req: Request | string) => Promise<Response>;
  };
  NODE_ENV?: string;
  PUBLIC_ORIGIN?: string;
  CORS_WHITELIST?: string;
  INITIAL_ADMIN_EMAIL?: string;
  INITIAL_ADMIN_PASSWORD?: string;
  NOTIFICATION_EMAIL?: string;
  RESEND_API_KEY?: string;
  SMTP_FROM?: string;
  WHATSAPP_NUMBER?: string;
  GEMINI_API_KEY?: string;
};

export type AppContext = {
  Bindings: CloudflareEnv;
  Variables: {
    adminUser?: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
};
