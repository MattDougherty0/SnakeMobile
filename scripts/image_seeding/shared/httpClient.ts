import axios, { AxiosInstance, AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface CacheConfig {
  enableDiskCaching: boolean;
  cacheTtlHours: number;
  cacheDir: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class HttpClient {
  private client: AxiosInstance;
  private cacheConfig: CacheConfig;
  private retryConfig: RetryConfig;
  private requestCounts: Map<string, number> = new Map();
  private lastRequestTimes: Map<string, number> = new Map();

  constructor(
    cacheConfig: CacheConfig,
    retryConfig: RetryConfig = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
  ) {
    this.cacheConfig = cacheConfig;
    this.retryConfig = retryConfig;
    
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'SnakeMobile-ImageSeeding/1.0'
      }
    });

    // Ensure cache directory exists
    if (this.cacheConfig.enableDiskCaching) {
      fs.mkdirSync(this.cacheConfig.cacheDir, { recursive: true });
    }
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  private getCachePath(url: string): string {
    const key = this.getCacheKey(url);
    return path.join(this.cacheConfig.cacheDir, `${key}.json`);
  }

  private isCacheValid(cachePath: string): boolean {
    if (!fs.existsSync(cachePath)) return false;
    
    const stats = fs.statSync(cachePath);
    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    return ageHours < this.cacheConfig.cacheTtlHours;
  }

  private loadFromCache(cachePath: string): any {
    try {
      const data = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  private saveToCache(cachePath: string, data: any): void {
    try {
      const cacheData = {
        timestamp: Date.now(),
        data: data
      };
      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.warn(`Failed to save cache for ${cachePath}:`, error);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(source: string): Promise<void> {
    const now = Date.now();
    const lastRequest = this.lastRequestTimes.get(source) || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    // Simple rate limiting - can be enhanced with more sophisticated algorithms
    if (timeSinceLastRequest < 1000) { // 1 second minimum between requests
      await this.delay(1000 - timeSinceLastRequest);
    }
    
    this.lastRequestTimes.set(source, Date.now());
  }

  async get<T = any>(url: string, source: string = 'unknown'): Promise<T> {
    // Enforce rate limiting
    await this.enforceRateLimit(source);

    // Check cache first
    if (this.cacheConfig.enableDiskCaching) {
      const cachePath = this.getCachePath(url);
      if (this.isCacheValid(cachePath)) {
        const cached = this.loadFromCache(cachePath);
        if (cached) {
          console.log(`Cache hit for ${url}`);
          return cached.data;
        }
      }
    }

    // Make request with retries
    let lastError: Error;
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`Requesting ${url} (attempt ${attempt + 1})`);
        const response: AxiosResponse<T> = await this.client.get(url);
        
        // Save to cache
        if (this.cacheConfig.enableDiskCaching) {
          const cachePath = this.getCachePath(url);
          this.saveToCache(cachePath, response.data);
        }
        
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        
        console.log(`Request failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError || new Error('Request failed after all retries');
  }

  async downloadImage(url: string, destinationPath: string): Promise<void> {
    try {
      const response = await this.client.get(url, {
        responseType: 'stream'
      });
      
      const writer = fs.createWriteStream(destinationPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download image from ${url}: ${error}`);
    }
  }

  getRequestCount(source: string): number {
    return this.requestCounts.get(source) || 0;
  }

  resetRequestCounts(): void {
    this.requestCounts.clear();
    this.lastRequestTimes.clear();
  }
}
