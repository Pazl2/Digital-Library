import { API_CONFIG } from './config.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.openLibrary.url;
    this.coversURL = API_CONFIG.openLibrary.endpoints.covers;
    this.setupSecurityMeasures();
  }

  setupSecurityMeasures() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      console.log('[API call]', args[0]);
      return originalFetch.call(window, ...args);
    };
  }

  async get(endpoint, params = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    const queryString = this._buildQueryString(params);
    const url = `${this.baseURL}${endpoint}${queryString}`;

    try {
      const response = await fetch(url, defaultOptions);
      if (!response.ok) {
        throw new Error(`API ${endpoint} failed: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async searchBooks(query, limit = 10) {
    return this.get(API_CONFIG.openLibrary.endpoints.search, {
      q: query,
      limit,
      fields: 'key,title,author_name,isbn,cover_i,first_publish_year,subject',
    });
  }

  getCoverUrl(coverId, size = 'M') {
    if (!coverId) return null;
    return `${this.coversURL}/${coverId}-${size}.jpg`;
  }

  _buildQueryString(params) {
    const sp = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] != null) sp.append(key, params[key]);
    });
    const str = sp.toString();
    return str ? `?${str}` : '';
  }
}

export default new ApiService();