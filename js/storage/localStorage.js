class LocalStorageService {
  constructor() {
    this.storage = window.localStorage;
    this.initializeStorage();
  }

  initializeStorage() {
    if (!this.storage.getItem('app_settings')) {
      this.storage.setItem('app_settings', JSON.stringify({
        theme: 'light',
        language: 'ru',
        cacheDuration: 3600000, 
      }));
    }
  }

  set(key, value) {
    try {
      const item = {
        value: value,
        timestamp: new Date().getTime(),
      };
      this.storage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  get(key, defaultValue = null, maxAge = null) {
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return defaultValue;

      const parsed = JSON.parse(raw);

      if (maxAge && new Date().getTime() - parsed.timestamp > maxAge) {
        this.remove(key);
        return defaultValue;
      }

      return parsed.value;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  remove(key) {
    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  clearExpired() {
    const settings = this.get('app_settings');
    const cacheDuration = settings?.cacheDuration || 3600000;
    const now = new Date().getTime();

    Object.keys(this.storage).forEach(key => {
      if (key === 'app_settings') return;
      const raw = this.storage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.timestamp && now - parsed.timestamp > cacheDuration) {
            this.remove(key);
          }
        } catch {

          this.remove(key);
        }
      }
    });
  }

  getAllKeys() {
    return Object.keys(this.storage);
  }

  clearCache(keepKeys = ['app_settings']) {
    Object.keys(this.storage).forEach(key => {
      if (!keepKeys.includes(key)) {
        this.remove(key);
      }
    });
  }

  hasValid(key, maxAge = null) {
    return this.get(key, null, maxAge) !== null;
  }
}

export default new LocalStorageService();