"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpClient = createHttpClient;
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
function createHttpClient(options) {
    const { baseURL, apiKey, headers = {}, retries = 2, debug = false, job } = options;
    const http = axios_1.default.create({
        baseURL,
        timeout: 15000,
        headers: Object.assign(Object.assign({ 'Content-Type': 'application/json' }, (apiKey ? { Authorization: `Bearer ${apiKey}` } : {})), headers),
    });
    // Retry network/5xx errors automatically
    (0, axios_retry_1.default)(http, {
        retries,
        retryDelay: axios_retry_1.default.exponentialDelay,
        retryCondition: (error) => {
            var _a, _b;
            return axios_retry_1.default.isNetworkError(error) || axios_retry_1.default.isRetryableError(error) || ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : 0) >= 500;
        },
    });
    // Request logging
    http.interceptors.request.use(async (config) => {
        var _a;
        if (debug && job) {
            await job.log(LogLevel.Debug, `[HTTP →] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.baseURL}${config.url}`);
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
        var _a, _b;
        const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
        const url = (_b = error.config) === null || _b === void 0 ? void 0 : _b.url;
        const message = extractErrorMessage(error);
        if (debug && job) {
            await job.log(LogLevel.Debug, `[HTTP ×] ${status !== null && status !== void 0 ? status : 'Unknown'} ${url !== null && url !== void 0 ? url : ''} → ${message}`);
        }
        const normalized = new Error(`HTTP ${status !== null && status !== void 0 ? status : 'Unknown'}: ${message}${url ? ` (${url})` : ''}`);
        normalized.status = status;
        normalized.details = message;
        throw normalized;
    });
    return http;
}
// Helper to extract error message safely
function extractErrorMessage(error) {
    var _a;
    if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) {
        try {
            if (typeof error.response.data === 'string')
                return error.response.data;
            return JSON.stringify(error.response.data);
        }
        catch (_b) {
            return 'Unknown error format';
        }
    }
    return error.message || 'Unknown error';
}
