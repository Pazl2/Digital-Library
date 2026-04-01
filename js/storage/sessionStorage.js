class SessionStorageService {
  constructor() {
    this.storage = window.sessionStorage;
  }

  set(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify({ value, timestamp: new Date().getTime() }));
      return true;
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
      return false;
    }
  }

  get(key, defaultValue = null) {
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw).value;
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return defaultValue;
    }
  }

  remove(key) {
    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from sessionStorage:', error);
      return false;
    }
  }

  clear() {
    this.storage.clear();
  }
}

export default new SessionStorageService();