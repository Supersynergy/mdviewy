function renderDocument(source) {
  const content = DOMPurify.sanitize(marked.parse(source), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'iframe', 'video', 'audio', 'source', 'picture', 'link', 'meta', 'base'],
    FORBID_ATTR: ['style', 'srcset', 'id', 'name', 'background', 'autofocus'],
    RETURN_DOM_FRAGMENT: true
  });
  for (const img of content.querySelectorAll('img')) {
    if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(img.getAttribute('src') || '')) {
      img.replaceWith(document.createTextNode(img.alt || '[Image]'));
    }
  }
  for (const input of content.querySelectorAll('input')) {
    if (input.type === 'checkbox') input.disabled = true;
    else input.remove();
  }
  const used = new Set();
  for (const heading of content.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const base = heading.textContent.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'section';
    let id = base;
    for (let i = 1; used.has(id); i++) id = base + '-' + i;
    heading.id = id;
    used.add(id);
  }
  for (const table of content.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    table.replaceWith(wrap);
    wrap.append(table);
  }
  document.querySelector('main').replaceChildren(content);
}
function exportDocument() {
  const page = document.documentElement.cloneNode(true);
  for (const script of page.querySelectorAll('script')) script.remove();
  return '<!doctype html>\n' + page.outerHTML;
}

function documentOutline() {
  return Array.from(document.querySelectorAll('main :is(h1,h2,h3,h4,h5,h6)[id]'),
    node => ({ title: node.textContent, id: node.id }));
}

function focusHeading(id) {
  const heading = document.getElementById(id);
  if (!heading) return false;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: 'start' });
  return document.activeElement === heading;
}
