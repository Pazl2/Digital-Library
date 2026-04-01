export const API_CONFIG = {
  openLibrary: {
    url: 'https://openlibrary.org',
    endpoints: {
      search: '/search.json',
      covers: 'https://covers.openlibrary.org/b/id',
    },
  },
};

export const CACHE_DURATION = 3600000;          
export const CACHE_KEY_PREFIX = 'dl_cache_';   
export const SEARCH_CACHE_KEY = 'dl_last_search'; 

export const FALLBACK_DATA = [
  {
    id: 'OL45883W',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0743273565',
    image: 'images/book1.jpg',
    cover: null,
    genre: 'Classic Fiction',
    description: 'A story of wealth, obsession, and the American Dream set in the 1920s.',
    publishYear: 1925,
    source: 'local',
  },
  {
    id: 'OL52163W',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0060935467',
    image: 'images/book2.jpg',
    cover: null,
    genre: 'Classic Fiction',
    description: 'A powerful tale of racial injustice and moral growth in the American South.',
    publishYear: 1960,
    source: 'local',
  },
  {
    id: 'OL1168007W',
    title: '1984',
    author: 'George Orwell',
    isbn: '978-0451524935',
    image: 'images/book3.jpg',
    cover: null,
    genre: 'Dystopian',
    description: 'A chilling vision of totalitarianism and the destruction of individual thought.',
    publishYear: 1949,
    source: 'local',
  },
  {
    id: 'OL66554W',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    isbn: '978-0141439518',
    image: 'images/book4.jpg',
    cover: null,
    genre: 'Romance',
    description: 'A witty romantic novel exploring love, class, and marriage in Regency England.',
    publishYear: 1813,
    source: 'local',
  },
  {
    id: 'OL50967W',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    isbn: '978-0316769174',
    image: 'images/book5.jpg',
    cover: null,
    genre: 'Literary Fiction',
    description: 'A coming-of-age story following troubled teenager Holden Caulfield.',
    publishYear: 1951,
    source: 'local',
  },
  {
    id: 'OL3335700W',
    title: 'Brave New World',
    author: 'Aldous Huxley',
    isbn: '978-0060850524',
    image: 'images/book6.jpg',
    cover: null,
    genre: 'Dystopian',
    description: 'A dystopian future where society is controlled through pleasure and conditioning.',
    publishYear: 1932,
    source: 'local',
  },
];