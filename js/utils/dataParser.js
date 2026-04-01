export const parseJSON = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
};

export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Unknown date';
  }
};

export const truncateText = (text, maxLength, useWordBoundary = true) => {
  if (!text || text.length <= maxLength) return text ?? '';
  let truncated = text.substr(0, maxLength);
  if (useWordBoundary) {
    truncated = truncated.substr(0, Math.min(truncated.length, truncated.lastIndexOf(' ')));
  }
  return truncated + '...';
};

export const createElementFromData = (data, template) => {
  try {
    let html = template;
    Object.keys(data).forEach(key => {
      const value = data[key] ?? '';
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  } catch (error) {
    console.error('Error creating element from template:', error);
    return document.createElement('div');
  }
};

export const filterData = (item, filters) => {
  return Object.keys(filters).every(key => {
    const filterValue = filters[key];
    const itemValue   = item[key];
    if (filterValue === '' || filterValue == null) return true;
    if (typeof filterValue === 'string') {
      return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
    }
    return itemValue === filterValue;
  });
};

export const sortData = (data, key, direction = 'asc') => {
  return [...data].sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ?  1 : -1;
    return 0;
  });
};

export const parseOpenLibraryBook = (doc, getCoverUrl) => {
  return {
    id:          doc.key || `ol_${Math.random().toString(36).substr(2, 9)}`,
    title:       doc.title || 'Untitled',
    author:      doc.author_name ? doc.author_name[0] : 'Unknown Author',
    isbn:        doc.isbn        ? doc.isbn[0]        : '—',
    cover:       doc.cover_i    ? getCoverUrl(doc.cover_i) : null,
    image:       null,  
    publishYear: doc.first_publish_year || '—',
    genre:       doc.subject    ? doc.subject[0]      : 'General Fiction',
    description: `Published: ${doc.first_publish_year || 'unknown'}`,
    source:      'api',
  };
};

export const isObject  = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const isArray   = (v) => Array.isArray(v);
export const isEmpty   = (v) => {
  if (v == null) return true;
  if (typeof v === 'string')  return v.trim().length === 0;
  if (Array.isArray(v))       return v.length === 0;
  if (typeof v === 'object')  return Object.keys(v).length === 0;
  return false;
};