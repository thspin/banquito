import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');

interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
}

class ApiClient {
  private client: AxiosInstance;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_DEDUP_TTL = 5000; // 5 seconds

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if needed in the future
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 500) {
          console.error('Server error:', error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate a unique key for request deduplication
   */
  private getRequestKey(method: string, url: string, params?: unknown, data?: unknown): string {
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  /**
   * Clean up expired pending requests
   */
  private cleanupPendingRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_DEDUP_TTL) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Execute request with deduplication
   */
  private async executeWithDedup<T>(
    method: string,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    this.cleanupPendingRequests();
    
    const key = this.getRequestKey(method, url, config?.params, config?.data);
    
    // Check if there's a pending identical request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise as Promise<T>;
    }

    // Create new request
    const promise = this.client.request<T>({ ...config, method, url })
      .then(response => response.data)
      .finally(() => {
        // Remove from pending after completion
        setTimeout(() => this.pendingRequests.delete(key), 100);
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  // Generic request methods with deduplication
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return this.executeWithDedup<T>('GET', url, { params });
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.executeWithDedup<T>('POST', url, { data });
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.executeWithDedup<T>('PUT', url, { data });
  }

  async delete<T>(url: string): Promise<T> {
    return this.executeWithDedup<T>('DELETE', url);
  }

  /**
   * Make a request without deduplication (for non-idempotent operations that need to run immediately)
   */
  async requestWithoutDedup<T>(
    method: string,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.request<T>({ ...config, method, url });
    return response.data;
  }
}

export const apiClient = new ApiClient();
