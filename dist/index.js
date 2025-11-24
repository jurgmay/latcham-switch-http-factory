import axios from 'axios';
import axiosRetry from 'axios-retry';
export function createHttpClient(options) {
    const { baseURL, apiKey, headers = {}, retries = 2, debug = false, job } = options;
    const http = axios.create({
        baseURL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            ...headers,
        },
    });
    // Retry network/5xx errors automatically
    axiosRetry(http, {
        retries,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
            return axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error) || (error.response?.status ?? 0) >= 500;
        },
    });
    // Request logging
    http.interceptors.request.use(async (config) => {
        if (debug && job) {
            await job.log(LogLevel.Debug, `[HTTP →] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
            if (config.data) {
                await job.log(LogLevel.Debug, 'Payload: ' + JSON.stringify(config.data).slice(0, 500) + '...');
            }
        }
        return config;
    }, (error) => Promise.reject(error));
    // Response logging + error normalization
    http.interceptors.response.use(async (response) => {
        if (debug && job) {
            await job.log(LogLevel.Debug, `[HTTP ←] ${response.status} ${response.config.url}`);
        }
        return response;
    }, async (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const message = extractErrorMessage(error);
        if (debug && job) {
            await job.log(LogLevel.Debug, `[HTTP ×] ${status ?? 'Unknown'} ${url ?? ''} → ${message}`);
        }
        const normalized = new Error(`HTTP ${status ?? 'Unknown'}: ${message}${url ? ` (${url})` : ''}`);
        normalized.status = status;
        normalized.details = message;
        throw normalized;
    });
    return http;
}
// Helper to extract error message safely
function extractErrorMessage(error) {
    if (error.response?.data) {
        try {
            if (typeof error.response.data === 'string')
                return error.response.data;
            return JSON.stringify(error.response.data);
        }
        catch {
            return 'Unknown error format';
        }
    }
    return error.message || 'Unknown error';
}
