
import { debounce, saveToStorage, loadFromStorage } from './utils/helper.js';
import { modal } from './components/modal.js';



const BOOKS_DATA = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0743273565',
    image: 'images/book1.jpg',
    genre: 'Classic Fiction',
    description: 'A story of wealth, obsession, and the American Dream set in the 1920s.'
  },
  {
    id: 2,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0060935467',
    image: 'images/book2.jpg',
    genre: 'Classic Fiction',
    description: 'A powerful tale of racial injustice and moral growth in the American South.'
  },
  {
    id: 3,
    title: '1984',
    author: 'George Orwell',
    isbn: '978-0451524935',
    image: 'images/book3.jpg',
    genre: 'Dystopian',
    description: 'A chilling vision of totalitarianism and the destruction of individual thought.'
  },
  {
    id: 4,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    isbn: '978-0141439518',
    image: 'images/book4.jpg',
    genre: 'Romance',
    description: 'A witty romantic novel exploring love, class, and marriage in Regency England.'
  },
  {
    id: 5,
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    isbn: '978-0316769174',
    image: 'images/book5.jpg',
    genre: 'Literary Fiction',
    description: 'A coming-of-age story following troubled teenager Holden Caulfield.'
  },
  {
    id: 6,
    title: 'Brave New World',
    author: 'Aldous Huxley',
    isbn: '978-0060850524',
    image: 'images/book6.jpg',
    genre: 'Dystopian',
    description: 'A dystopian future where society is controlled through pleasure and conditioning.'
  }
];



let state = {
  books: BOOKS_DATA,
  filteredBooks: BOOKS_DATA,
  shelf: loadFromStorage('digitalLibrary_shelf', []),
  ratings: loadFromStorage('digitalLibrary_ratings', {}),
  reviews: loadFromStorage('digitalLibrary_reviews', {}),
  searchQuery: '',
  autocompleteActive: false,
};



const catalogGrid = document.querySelector('.catalog__grid');
const authorInput = document.querySelector('#author');
const nameInput = document.querySelector('#name');
const isbnInput = document.querySelector('#isbn');
const filterForm = document.querySelector('.filter__form');
const headerNav = document.querySelector('.header__nav-list');
const burgerBtn = document.querySelector('.header__burger');



function renderBooks(books) {
  catalogGrid.innerHTML = '';

  if (books.length === 0) {
    catalogGrid.innerHTML = `
      <div class="catalog__empty">
        <p>No books found matching your search.</p>
      </div>`;
    return;
  }

  books.forEach(book => {
    const isOnShelf = state.shelf.includes(book.id);
    const avgRating = getAverageRating(book.id);
    const starHTML = renderStars(book.id, avgRating, false);

    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('itemscope', '');
    card.setAttribute('itemtype', 'https://schema.org/Book');
    card.dataset.bookId = book.id;

    card.innerHTML = `
      <figure class="book-card__figure">
        <img src="${book.image}" alt="Book cover of ${book.title}" class="book-card__image" onerror="this.src='images/placeholder.png'">
      </figure>
      <h3 itemprop="name" class="book-card__title">${book.title}</h3>
      <div class="book-card__info">
        <p class="book-card__author">Author: <span itemprop="author">${book.author}</span></p>
        <p class="book-card__isbn">ISBN: <span itemprop="isbn">${book.isbn}</span></p>
      </div>
      <div class="book-card__rating" aria-label="Rating for ${book.title}">
        ${starHTML}
        <span class="book-card__rating-count">${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'}</span>
      </div>
      <div class="book-card__actions">
        <button class="book-card__btn book-card__btn--details" data-id="${book.id}" aria-label="View details for ${book.title}">Details</button>
        <button class="book-card__btn book-card__btn--shelf ${isOnShelf ? 'on-shelf' : ''}" data-id="${book.id}" aria-label="${isOnShelf ? 'Remove from shelf' : 'Add to shelf'}" aria-pressed="${isOnShelf}">
          ${isOnShelf ? '★ Shelved' : '☆ Add to Shelf'}
        </button>
      </div>
    `;

    const stars = card.querySelectorAll('.star[data-interactive]');
    stars.forEach(star => {
      star.addEventListener('click', () => handleRating(book.id, parseInt(star.dataset.value)));
      star.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') handleRating(book.id, parseInt(star.dataset.value));
      });
    });

    card.querySelector('.book-card__btn--details').addEventListener('click', () => openBookModal(book));
    card.querySelector('.book-card__btn--shelf').addEventListener('click', () => toggleShelf(book.id));

    catalogGrid.appendChild(card);
  });
}

function renderStars(bookId, currentRating, interactive = true) {
  return Array.from({ length: 5 }, (_, i) => {
    const val = i + 1;
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

function getAverageRating(bookId) {
  const ratings = state.ratings[bookId];
  if (!ratings || ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function handleRating(bookId, value) {
  if (!state.ratings[bookId]) state.ratings[bookId] = [];
  state.ratings[bookId].push(value);
  saveToStorage('digitalLibrary_ratings', state.ratings);
  renderBooks(state.filteredBooks);

  showToast(`You rated "${BOOKS_DATA.find(b => b.id === bookId).title}" ${value} star${value > 1 ? 's' : ''}!`);
}


function toggleShelf(bookId) {
  const idx = state.shelf.indexOf(bookId);
  if (idx === -1) {
    state.shelf.push(bookId);
    showToast('Added to your shelf! 📚');
  } else {
    state.shelf.splice(idx, 1);
    showToast('Removed from shelf.');
  }
  saveToStorage('digitalLibrary_shelf', state.shelf);
  renderBooks(state.filteredBooks);
  updateShelfNav();


  if (document.querySelector('.shelf-modal')) openShelfModal();
}

function openShelfModal() {
  const shelfBooks = state.books.filter(b => state.shelf.includes(b.id));
  const container = document.createElement('div');
  container.className = 'shelf-modal';

  container.innerHTML = `
    <h2 class="modal-title">My Shelf 📚</h2>
    ${shelfBooks.length === 0
      ? '<p class="shelf-modal__empty">Your shelf is empty. Add books from the catalog!</p>'
      : `<div class="shelf-modal__grid">
          ${shelfBooks.map(book => `
            <div class="shelf-item">
              <img src="${book.image}" alt="${book.title}" class="shelf-item__image" onerror="this.src='images/placeholder.jpg'">
              <div class="shelf-item__info">
                <p class="shelf-item__title">${book.title}</p>
                <p class="shelf-item__author">${book.author}</p>
              </div>
              <button class="shelf-item__remove" data-id="${book.id}" aria-label="Remove ${book.title} from shelf">✕</button>
            </div>
          `).join('')}
        </div>`
    }
  `;

  container.querySelectorAll('.shelf-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleShelf(parseInt(btn.dataset.id));
    });
  });

  modal.open(container);
}

function updateShelfNav() {
  const existingShelfLink = headerNav.querySelector('.shelf-nav-item');
  if (existingShelfLink) {
    existingShelfLink.querySelector('.shelf-count').textContent = state.shelf.length;
  }
}



function openBookModal(book) {
  const avgRating = getAverageRating(book.id);
  const reviews = state.reviews[book.id] || [];
  const isOnShelf = state.shelf.includes(book.id);

  const container = document.createElement('div');
  container.className = 'book-modal';

  container.innerHTML = `
    <div class="book-modal__header">
      <img src="${book.image}" alt="${book.title}" class="book-modal__image" onerror="this.src='images/placeholder.jpg'">
      <div class="book-modal__meta">
        <h2 class="book-modal__title">${book.title}</h2>
        <p class="book-modal__author">${book.author}</p>
        <p class="book-modal__genre">${book.genre}</p>
        <p class="book-modal__isbn">ISBN: ${book.isbn}</p>
        <p class="book-modal__description">${book.description}</p>
        <button class="book-card__btn book-card__btn--shelf ${isOnShelf ? 'on-shelf' : ''}" data-id="${book.id}">
          ${isOnShelf ? '★ Remove from Shelf' : '☆ Add to Shelf'}
        </button>
      </div>
    </div>

    <div class="book-modal__rating-section">
      <h3>Rate this book</h3>
      <div class="book-modal__stars" role="group" aria-label="Rate ${book.title}">
        ${renderStars(book.id, avgRating, true)}
      </div>
      <span class="book-modal__avg">${avgRating > 0 ? `Average: ${avgRating.toFixed(1)} / 5` : 'No ratings yet'}</span>
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
          <input type="text" id="review-name" class="filter__input" placeholder="Enter your name" required>
        </div>
        <div class="review-form__group">
          <label class="filter__label">Rating</label>
          <div class="review-form__stars" role="group" aria-label="Choose rating">
            ${[1,2,3,4,5].map(v => `
              <span class="star review-star" data-value="${v}" role="button" tabindex="0" aria-label="${v} star">★</span>
            `).join('')}
          </div>
          <input type="hidden" id="review-rating" value="0">
        </div>
        <div class="review-form__group">
          <label for="review-text" class="filter__label">Review</label>
          <textarea id="review-text" class="filter__input filter__textarea" placeholder="Share your thoughts..." rows="3" required></textarea>
        </div>
        <button type="submit" class="filter__submit review-form__submit">Submit Review</button>
      </form>
    </div>
  `;

  container.querySelector('.book-card__btn--shelf').addEventListener('click', () => {
    toggleShelf(book.id);
    const btn = container.querySelector('.book-card__btn--shelf');
    const onShelf = state.shelf.includes(book.id);
    btn.textContent = onShelf ? '★ Remove from Shelf' : '☆ Add to Shelf';
    btn.classList.toggle('on-shelf', onShelf);
  });

  // Modal star ratings
  const modalStars = container.querySelectorAll('.book-modal__stars .star[data-interactive]');
  modalStars.forEach(star => {
    star.addEventListener('click', () => {
      handleRating(book.id, parseInt(star.dataset.value));
      const newAvg = getAverageRating(book.id);
      container.querySelector('.book-modal__avg').textContent = `Average: ${newAvg.toFixed(1)} / 5`;
      modalStars.forEach((s, i) => s.classList.toggle('star--filled', i < parseInt(star.dataset.value)));
    });
    star.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') star.click();
    });
  });


  let selectedRating = 0;
  const reviewStars = container.querySelectorAll('.review-star');
  reviewStars.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.value);
      container.querySelector('#review-rating').value = selectedRating;
      reviewStars.forEach((s, i) => s.classList.toggle('star--filled', i < selectedRating));
    });
    star.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') star.click();
    });
    star.addEventListener('mouseenter', () => {
      const hoverVal = parseInt(star.dataset.value);
      reviewStars.forEach((s, i) => s.classList.toggle('star--hover', i < hoverVal));
    });
    star.addEventListener('mouseleave', () => {
      reviewStars.forEach(s => s.classList.remove('star--hover'));
    });
  });


  container.querySelector('.review-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = container.querySelector('#review-name').value.trim();
    const text = container.querySelector('#review-text').value.trim();
    const rating = parseInt(container.querySelector('#review-rating').value);

    if (!name) { showToast('Please enter your name.'); return; }
    if (rating === 0) { showToast('Please select a rating.'); return; }
    if (!text) { showToast('Please write a review.'); return; }

    if (!state.reviews[book.id]) state.reviews[book.id] = [];
    state.reviews[book.id].push({ name, text, rating });
    saveToStorage('digitalLibrary_reviews', state.reviews);

    showToast('Review submitted! Thank you 🎉');
    modal.close();
    openBookModal(book); // Re-open with new review
  });

  modal.open(container);
}



function setupAutocomplete(input, getOptions) {
  let dropdown = null;

  function closeDropdown() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
    state.autocompleteActive = false;
  }

  function createDropdown(matches) {
    closeDropdown();
    if (matches.length === 0) return;

    dropdown = document.createElement('ul');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-label', 'Search suggestions');

    matches.forEach((match, idx) => {
      const li = document.createElement('li');
      li.className = 'autocomplete-item';
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '-1');
      li.textContent = match;

      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = match;
        closeDropdown();
        filterBooks();
      });

      dropdown.appendChild(li);
    });

    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(dropdown);
    state.autocompleteActive = true;
  }

  input.addEventListener('input', debounce(() => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 1) { closeDropdown(); return; }
    const matches = getOptions().filter(opt => opt.toLowerCase().includes(query)).slice(0, 5);
    createDropdown(matches);
    filterBooks();
  }, 200));

  input.addEventListener('keydown', (e) => {
    if (!dropdown) return;
    const items = dropdown.querySelectorAll('.autocomplete-item');
    const focused = dropdown.querySelector('.autocomplete-item--focused');
    let idx = Array.from(items).indexOf(focused);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = (idx + 1) % items.length;
      items.forEach(i => i.classList.remove('autocomplete-item--focused'));
      items[idx].classList.add('autocomplete-item--focused');
      items[idx].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = (idx - 1 + items.length) % items.length;
      items.forEach(i => i.classList.remove('autocomplete-item--focused'));
      items[idx].classList.add('autocomplete-item--focused');
      items[idx].focus();
    } else if (e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'Enter') {
      if (focused) { input.value = focused.textContent; closeDropdown(); filterBooks(); }
    }
  });

  input.addEventListener('blur', () => setTimeout(closeDropdown, 150));
}



function filterBooks() {
  const author = authorInput.value.trim().toLowerCase();
  const name = nameInput.value.trim().toLowerCase();
  const isbn = isbnInput.value.trim().toLowerCase();

  state.filteredBooks = state.books.filter(book => {
    const matchAuthor = !author || book.author.toLowerCase().includes(author);
    const matchName = !name || book.title.toLowerCase().includes(name);
    const matchIsbn = !isbn || book.isbn.toLowerCase().includes(isbn);
    return matchAuthor && matchName && matchIsbn;
  });

  renderBooks(state.filteredBooks);
}



function showToast(message) {
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



function setupNav() {

  const shelfItem = document.createElement('li');
  shelfItem.className = 'shelf-nav-item';
  shelfItem.innerHTML = `
    <a href="#" class="header__nav-link" id="shelf-nav-link" aria-label="View my shelf">
      My Shelf <span class="shelf-count">${state.shelf.length}</span>
    </a>`;
  headerNav.appendChild(shelfItem);

  document.getElementById('shelf-nav-link').addEventListener('click', (e) => {
    e.preventDefault();
    openShelfModal();
  });


  if (burgerBtn) {
    const mobileNav = document.createElement('nav');
    mobileNav.className = 'header__nav header__nav--mobile';
    mobileNav.innerHTML = document.querySelector('.header__nav').innerHTML;
    document.querySelector('.header').appendChild(mobileNav);

    burgerBtn.addEventListener('click', () => {
      const active = burgerBtn.classList.toggle('header__burger--active');
      mobileNav.classList.toggle('active', active);
      burgerBtn.setAttribute('aria-expanded', active);
    });
  }
}



function init() {
  setupNav();


  setupAutocomplete(authorInput, () => state.books.map(b => b.author));
  setupAutocomplete(nameInput, () => state.books.map(b => b.title));


  filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    filterBooks();
  });


  [authorInput, nameInput, isbnInput].forEach(input => {
    input.addEventListener('input', debounce(filterBooks, 300));
  });


  renderBooks(state.filteredBooks);
}

document.addEventListener('DOMContentLoaded', init);