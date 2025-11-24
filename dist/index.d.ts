import { AxiosInstance } from 'axios';
interface HttpClientOptions {
    baseURL: string;
    apiKey?: string;
    headers?: Record<string, string>;
    retries?: number;
    debug?: boolean;
    job?: Job;
}
export declare function createHttpClient(options: HttpClientOptions): AxiosInstance;
export {};
