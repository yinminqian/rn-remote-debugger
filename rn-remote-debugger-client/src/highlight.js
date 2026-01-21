export const highlightText = (text, search) => {
  if (!search) return text;

  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedSearch})`, 'gi'));

  return parts.map((part, i) =>
    part.toLowerCase() === search.toLowerCase()
      ? <mark key={i} style={{ background: '#fff566', padding: 0 }}>{part}</mark>
      : part
  );
};
