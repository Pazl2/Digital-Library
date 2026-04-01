import apiService            from './api/apiService.js';
import localStorageService   from './storage/localStorage.js';
import sessionStorageService from './storage/sessionStorage.js';
import { parseOpenLibraryBook, truncateText } from './utils/dataParser.js';
import { debounce }          from './utils/helper.js';
import { modal }             from './components/modal.js';
import {
  FALLBACK_DATA,
  CACHE_DURATION,
  CACHE_KEY_PREFIX,
  SEARCH_CACHE_KEY,
} from './api/config.js';

class APIIntegrationManager {
  constructor() {
    this.localStorage   = localStorageService;
    this.sessionStorage = sessionStorageService;

    this.currentData = [];
    this.isLoading   = false;

    this.shelf   = this.localStorage.get('dl_shelf',   []) || [];
    this.ratings = this.localStorage.get('dl_ratings', {}) || {};
    this.reviews = this.localStorage.get('dl_reviews', {}) || {};

    this.init();
  }

  async init() {
    await this.initializeAPI();
    this.setupEventListeners();
    this.loadCachedData();
    this.setupSecurityMeasures();
    this.setupNav();
  }

  async initializeAPI() {
    this.localStorage.clearExpired();
    this.currentData = FALLBACK_DATA;
    this.renderData(this.currentData);
  }

  setupEventListeners() {

    const searchForm = document.querySelector('.filter__form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSearch();
      });
    }

    const refreshBtn = document.querySelector('#refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    const clearCacheBtn = document.querySelector('#clear-cache-btn');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => this.clearCache());
    }

    const nameInput = document.querySelector('#name');
    if (nameInput) {
      nameInput.addEventListener('input', debounce(() => {
        const query = nameInput.value.trim();
        if (query.length >= 3) {
          this.fetchData({ q: query });
        } else if (query.length === 0) {
          this.currentData = FALLBACK_DATA;
          this.renderData(this.currentData);
        }
      }, 600));
    }

    this.setupAutocomplete(
      document.querySelector('#name'),
      () => this.currentData.map(b => b.title)
    );
    this.setupAutocomplete(
      document.querySelector('#author'),
      () => this.currentData.map(b => b.author)
    );

    [document.querySelector('#author'), document.querySelector('#isbn')].forEach(input => {
      if (input) {
        input.addEventListener('input', debounce(() => this.applyClientFilter(), 300));
      }
    });
  }

  async handleSearch() {
    const query = document.querySelector('#name')?.value.trim() || '';
    if (!query) {
      this.showToast('Please enter a search query.');
      return;
    }
    await this.fetchData({ q: query });
  }

  async fetchData(params = {}) {
    this.showLoading(true);

    try {

      const cacheKey   = `${CACHE_KEY_PREFIX}${JSON.stringify(params)}`;
      const cachedData = this.localStorage.get(cacheKey, null, CACHE_DURATION);

      if (cachedData) {
        this.currentData = cachedData;
        this.renderData(cachedData);
        this.showToast('Loaded from cache 📦');
        return;
      }

      const query = params.q || 'classic literature';
      const data  = await apiService.searchBooks(query, 12);

      const books = (data.docs || [])
        .slice(0, 12)
        .map(doc => parseOpenLibraryBook(doc, id => apiService.getCoverUrl(id)));

      this.currentData = books.length > 0 ? books : FALLBACK_DATA;

      this.localStorage.set(cacheKey, this.currentData);
      this.localStorage.set(SEARCH_CACHE_KEY, {
        query,
        timestamp: new Date().toISOString(),
      });

      this.renderData(this.currentData);
      this.showToast('Books loaded ✓');

    } catch (error) {
      this.handleAPIError(error);
    } finally {
      this.showLoading(false);
    }
  }

  loadCachedData() {
    const lastSearch = this.localStorage.get(SEARCH_CACHE_KEY);
    if (!lastSearch) return;

    const cacheKey = `${CACHE_KEY_PREFIX}${JSON.stringify({ q: lastSearch.query })}`;
    const cached   = this.localStorage.get(cacheKey, null, CACHE_DURATION);

    if (cached) {
      this.currentData = cached;
      this.renderData(cached);
      this.showToast(`Cached results: "${lastSearch.query}" 📦`);
    }
  }

  handleAPIError(error) {
    console.error('API Error:', error);

    let msg = 'Failed to load data.';
    if (error.message?.includes('404'))    msg = 'Data not found (404).';
    else if (error.message?.includes('429')) msg = 'Too many requests. Try again later.';
    else if (error.message?.includes('401')) msg = 'Authorization error. Check your API key.';
    else if (!navigator.onLine)             msg = 'No internet connection.';

    this.showToast(msg);

    this.currentData = FALLBACK_DATA;
    this.renderData(FALLBACK_DATA);
  }

  async refreshData() {
    const KEEP = ['app_settings', 'dl_shelf', 'dl_ratings', 'dl_reviews', 'dl_offline_books'];
    this.localStorage.clearCache(KEEP);

    const lastSearch = this.localStorage.get(SEARCH_CACHE_KEY);
    await this.fetchData({ q: lastSearch ? lastSearch.query : 'classic literature' });
  }

  clearCache() {
    const KEEP = ['app_settings', 'dl_shelf', 'dl_ratings', 'dl_reviews', 'dl_offline_books'];
    this.localStorage.clearCache(KEEP);
    this.showToast('Cache cleared 🗑️');
    this.currentData = FALLBACK_DATA;
    this.renderData(FALLBACK_DATA);
  }

  applyClientFilter() {
    const author = document.querySelector('#author')?.value.trim().toLowerCase() || '';
    const isbn   = document.querySelector('#isbn')?.value.trim().toLowerCase()   || '';

    const filtered = this.currentData.filter(book => {
      const okAuthor = !author || book.author.toLowerCase().includes(author);
      const okIsbn   = !isbn   || (book.isbn || '').toLowerCase().includes(isbn);
      return okAuthor && okIsbn;
    });

    this.renderData(filtered);
  }

  renderData(books) {
    const container = document.querySelector('.catalog__grid');
    if (!container) return;

    container.innerHTML = '';

    if (!books || books.length === 0) {
      container.innerHTML = `
        <div class="catalog__empty">
          <p>No books found matching your search.</p>
        </div>`;
      return;
    }

    books.forEach(book => this.createDataElement(book, container));
  }

  createDataElement(book, container) {
    const isOnShelf = this.shelf.includes(book.id);
    const avgRating = this.getAverageRating(book.id);

    const imgSrc = book.cover || book.image || `images/placeholder.png`;

    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('itemscope', '');
    card.setAttribute('itemtype', 'https://schema.org/Book');
    card.dataset.bookId = book.id;

    card.innerHTML = `
      <figure class="book-card__figure">
        <img src="${imgSrc}"
             alt="Book cover of ${book.title}"
             class="book-card__image"
             onerror="this.src='images/placeholder.png'">
        ${book.source === 'api' ? '<span class="book-card__badge">API</span>' : ''}
      </figure>
      <h3 itemprop="name" class="book-card__title">${book.title}</h3>
      <div class="book-card__info">
        <p class="book-card__author">Author: <span itemprop="author">${book.author}</span></p>
        <p class="book-card__isbn">ISBN: <span itemprop="isbn">${book.isbn}</span></p>
        ${book.publishYear ? `<p class="book-card__year">Year: ${book.publishYear}</p>` : ''}
      </div>
      <div class="book-card__rating" aria-label="Rating for ${book.title}">
        ${this.renderStars(book.id, avgRating, false)}
        <span class="book-card__rating-count">${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'}</span>
      </div>
      <div class="book-card__actions">
        <button class="book-card__btn book-card__btn--details"
                data-id="${book.id}"
                aria-label="View details for ${book.title}">Details</button>
        <button class="book-card__btn book-card__btn--shelf ${isOnShelf ? 'on-shelf' : ''}"
                data-id="${book.id}"
                aria-label="${isOnShelf ? 'Remove from shelf' : 'Add to shelf'}"
                aria-pressed="${isOnShelf}">
          ${isOnShelf ? '★ Shelved' : '☆ Add to Shelf'}
        </button>
      </div>
    `;

    card.querySelector('.book-card__btn--details')
      .addEventListener('click', () => this.openBookModal(book));
    card.querySelector('.book-card__btn--shelf')
      .addEventListener('click', () => this.toggleShelf(book.id, book));

    container.appendChild(card);
  }

  renderStars(bookId, currentRating, interactive = true) {
    return Array.from({ length: 5 }, (_, i) => {
      const val    = i + 1;
      const filled = val <= Math.round(currentRating);
      if (interactive) {
        return `<span class="star ${filled ? 'star--filled' : ''}"
          data-value="${val}"
          data-interactive="true"
          role="button"
          tabindex="0"
          aria-label="Rate ${val} star${val > 1 ? 's' : ''}">★</span>`;
      }
      return `<span class="star ${filled ? 'star--filled' : ''}">★</span>`;
    }).join('');
  }

  getAverageRating(bookId) {
    const r = this.ratings[bookId];
    if (!r || r.length === 0) return 0;
    return r.reduce((a, b) => a + b, 0) / r.length;
  }

  handleRating(bookId, value, title) {
    if (!this.ratings[bookId]) this.ratings[bookId] = [];
    this.ratings[bookId].push(value);
    this.localStorage.set('dl_ratings', this.ratings);
    this.renderData(this.currentData);
    this.showToast(`You rated "${title}" ${value} star${value > 1 ? 's' : ''}!`);
  }

  toggleShelf(bookId, bookData = null) {
    const idx = this.shelf.indexOf(bookId);

    if (idx === -1) {
      this.shelf.push(bookId);

      if (bookData) {
        const offline = this.localStorage.get('dl_offline_books', {}) || {};
        offline[bookId] = bookData;
        this.localStorage.set('dl_offline_books', offline);
      }
      this.showToast('Added to your shelf! 📚');
    } else {
      this.shelf.splice(idx, 1);
      this.showToast('Removed from shelf.');
    }

    this.localStorage.set('dl_shelf', this.shelf);
    this.renderData(this.currentData);
    this.updateShelfNav();

    if (document.querySelector('.shelf-modal')) this.openShelfModal();
  }

  openShelfModal() {

    const offline    = this.localStorage.get('dl_offline_books', {}) || {};
    const shelfBooks = this.shelf
      .map(id => this.currentData.find(b => b.id === id) || offline[id])
      .filter(Boolean);

    const container = document.createElement('div');
    container.className = 'shelf-modal';

    container.innerHTML = `
      <h2 class="modal-title">My Shelf 📚</h2>
      <p class="shelf-modal__info">Books are saved for offline access</p>
      ${shelfBooks.length === 0
        ? '<p class="shelf-modal__empty">Your shelf is empty. Add books from the catalog!</p>'
        : `<div class="shelf-modal__grid">
            ${shelfBooks.map(book => {
              const src = book.cover || book.image || 'images/placeholder.png';
              return `
              <div class="shelf-item">
                <img src="${src}" alt="${book.title}" class="shelf-item__image"
                     onerror="this.src='images/placeholder.png'">
                <div class="shelf-item__info">
                  <p class="shelf-item__title">${book.title}</p>
                  <p class="shelf-item__author">${book.author}</p>
                  ${book.publishYear ? `<p class="shelf-item__year">${book.publishYear}</p>` : ''}
                </div>
                <button class="shelf-item__remove" data-id="${book.id}"
                        aria-label="Remove ${book.title} from shelf">✕</button>
              </div>`;
            }).join('')}
          </div>`
      }
    `;

    container.querySelectorAll('.shelf-item__remove').forEach(btn => {
      btn.addEventListener('click', () => this.toggleShelf(btn.dataset.id));
    });

    modal.open(container);
  }

  updateShelfNav() {
    const badge = document.querySelector('.shelf-count');
    if (badge) badge.textContent = this.shelf.length;
  }

  openBookModal(book) {
    const avgRating = this.getAverageRating(book.id);
    const reviews   = this.reviews[book.id] || [];
    const isOnShelf = this.shelf.includes(book.id);
    const imgSrc    = book.cover || book.image || 'images/placeholder.png';

    const container = document.createElement('div');
    container.className = 'book-modal';

    container.innerHTML = `
      <div class="book-modal__header">
        <img src="${imgSrc}" alt="${book.title}" class="book-modal__image"
             onerror="this.src='images/placeholder.png'">
        <div class="book-modal__meta">
          <h2 class="book-modal__title">${book.title}</h2>
          <p class="book-modal__author">${book.author}</p>
          <span class="book-modal__genre">${book.genre || 'Fiction'}</span>
          <p class="book-modal__isbn">ISBN: ${book.isbn}</p>
          ${book.publishYear ? `<p class="book-modal__isbn">Year: ${book.publishYear}</p>` : ''}
          <p class="book-modal__description">${book.description || ''}</p>
          <button class="book-card__btn book-card__btn--shelf ${isOnShelf ? 'on-shelf' : ''}"
                  data-id="${book.id}">
            ${isOnShelf ? '★ Remove from Shelf' : '☆ Add to Shelf'}
          </button>
        </div>
      </div>

      <div class="book-modal__rating-section">
        <h3>Rate this book</h3>
        <div class="book-modal__stars" role="group" aria-label="Rate ${book.title}">
          ${this.renderStars(book.id, avgRating, true)}
        </div>
        <span class="book-modal__avg">
          ${avgRating > 0 ? `Average: ${avgRating.toFixed(1)} / 5` : 'No ratings yet'}
        </span>
      </div>

      <div class="book-modal__reviews">
        <h3>Reviews</h3>
        <div class="review-list">
          ${reviews.length === 0
            ? '<p class="review-list__empty">No reviews yet. Be the first!</p>'
            : reviews.map(r => `
                <div class="review-item">
                  <strong class="review-item__author">${r.name}</strong>
                  <div class="review-item__stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                  <p class="review-item__text">${r.text}</p>
                </div>`).join('')
          }
        </div>

        <form class="review-form" novalidate>
          <h4>Leave a Review</h4>
          <div class="review-form__group">
            <label for="review-name" class="filter__label">Your name</label>
            <input type="text" id="review-name" class="filter__input"
                   placeholder="Enter your name" required>
          </div>
          <div class="review-form__group">
            <label class="filter__label">Rating</label>
            <div class="review-form__stars" role="group" aria-label="Choose rating">
              ${[1,2,3,4,5].map(v =>
                `<span class="star review-star" data-value="${v}"
                       role="button" tabindex="0" aria-label="${v} star">★</span>`
              ).join('')}
            </div>
            <input type="hidden" id="review-rating" value="0">
          </div>
          <div class="review-form__group">
            <label for="review-text" class="filter__label">Review</label>
            <textarea id="review-text" class="filter__input filter__textarea"
                      placeholder="Share your thoughts..." rows="3" required></textarea>
          </div>
          <button type="submit" class="filter__submit review-form__submit">Submit Review</button>
        </form>
      </div>
    `;

    container.querySelector('.book-card__btn--shelf').addEventListener('click', (e) => {
      this.toggleShelf(book.id, book);
      const btn     = e.currentTarget;
      const onShelf = this.shelf.includes(book.id);
      btn.textContent = onShelf ? '★ Remove from Shelf' : '☆ Add to Shelf';
      btn.classList.toggle('on-shelf', onShelf);
    });

    const modalStars = container.querySelectorAll('.book-modal__stars .star[data-interactive]');
    modalStars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.value);
        this.handleRating(book.id, val, book.title);
        const newAvg = this.getAverageRating(book.id);
        container.querySelector('.book-modal__avg').textContent = `Average: ${newAvg.toFixed(1)} / 5`;
        modalStars.forEach((s, i) => s.classList.toggle('star--filled', i < val));
      });
      star.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') star.click(); });
    });

    const reviewStars = container.querySelectorAll('.review-star');
    reviewStars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.value);
        container.querySelector('#review-rating').value = val;
        reviewStars.forEach((s, i) => s.classList.toggle('star--filled', i < val));
      });
      star.addEventListener('mouseenter', () => {
        const hv = parseInt(star.dataset.value);
        reviewStars.forEach((s, i) => s.classList.toggle('star--hover', i < hv));
      });
      star.addEventListener('mouseleave', () => {
        reviewStars.forEach(s => s.classList.remove('star--hover'));
      });
      star.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') star.click(); });
    });

    container.querySelector('.review-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name   = container.querySelector('#review-name').value.trim();
      const text   = container.querySelector('#review-text').value.trim();
      const rating = parseInt(container.querySelector('#review-rating').value);

      if (!name)      { this.showToast('Please enter your name.');    return; }
      if (rating < 1) { this.showToast('Please select a rating.');    return; }
      if (!text)      { this.showToast('Please write a review.');     return; }

      if (!this.reviews[book.id]) this.reviews[book.id] = [];
      this.reviews[book.id].push({ name, text, rating });
      this.localStorage.set('dl_reviews', this.reviews);

      this.showToast('Review submitted! Thank you 🎉');
      modal.close();
      this.openBookModal(book);
    });

    modal.open(container);
  }

  setupAutocomplete(input, getOptions) {
    if (!input) return;
    let dropdown = null;

    const closeDropdown = () => {
      if (dropdown) { dropdown.remove(); dropdown = null; }
    };

    const createDropdown = (matches) => {
      closeDropdown();
      if (matches.length === 0) return;

      dropdown = document.createElement('ul');
      dropdown.className = 'autocomplete-dropdown';
      dropdown.setAttribute('role', 'listbox');
      dropdown.setAttribute('aria-label', 'Search suggestions');

      matches.forEach(match => {
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.setAttribute('role', 'option');
        li.setAttribute('tabindex', '-1');
        li.textContent = match;
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = match;
          closeDropdown();
          this.applyClientFilter();
        });
        dropdown.appendChild(li);
      });

      input.parentNode.style.position = 'relative';
      input.parentNode.appendChild(dropdown);
    };

    input.addEventListener('input', debounce(() => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 1) { closeDropdown(); return; }
      const matches = [...new Set(getOptions())]
        .filter(o => o.toLowerCase().includes(query))
        .slice(0, 5);
      createDropdown(matches);
    }, 200));

    input.addEventListener('keydown', (e) => {
      if (!dropdown) return;
      const items   = dropdown.querySelectorAll('.autocomplete-item');
      const focused = dropdown.querySelector('.autocomplete-item--focused');
      let idx = Array.from(items).indexOf(focused);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        idx = (idx + 1) % items.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx - 1 + items.length) % items.length;
      } else if (e.key === 'Escape') {
        closeDropdown(); return;
      } else if (e.key === 'Enter' && focused) {
        input.value = focused.textContent; closeDropdown(); return;
      } else { return; }

      items.forEach(i => i.classList.remove('autocomplete-item--focused'));
      if (items[idx]) {
        items[idx].classList.add('autocomplete-item--focused');
        items[idx].focus();
      }
    });

    input.addEventListener('blur', () => setTimeout(closeDropdown, 150));
  }

  setupNav() {
    const headerNav = document.querySelector('.header__nav-list');
    if (!headerNav) return;

    const shelfItem = document.createElement('li');
    shelfItem.className = 'shelf-nav-item';
    shelfItem.innerHTML = `
      <a href="#" class="header__nav-link" id="shelf-nav-link" aria-label="View my shelf">
        My Shelf <span class="shelf-count">${this.shelf.length}</span>
      </a>`;
    headerNav.appendChild(shelfItem);

    document.getElementById('shelf-nav-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.openShelfModal();
    });

    const burgerBtn = document.querySelector('.header__burger');
    if (burgerBtn) {
      const mobileNav = document.createElement('nav');
      mobileNav.className = 'header__nav header__nav--mobile';
      mobileNav.innerHTML = headerNav.innerHTML;
      document.querySelector('.header').appendChild(mobileNav);

      burgerBtn.addEventListener('click', () => {
        const active = burgerBtn.classList.toggle('header__burger--active');
        mobileNav.classList.toggle('active', active);
        burgerBtn.setAttribute('aria-expanded', active);
      });
    }
  }

  setupSecurityMeasures() {

    this.localStorage.clearExpired();
  }

  showLoading(show) {
    this.isLoading = show;
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.style.display = show ? 'flex' : 'none';

    const title = document.querySelector('.catalog__title');
    if (title) title.textContent = show ? 'Loading...' : 'Catalog';
  }

  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new APIIntegrationManager();
});