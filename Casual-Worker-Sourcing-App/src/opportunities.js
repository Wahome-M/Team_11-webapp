// "Homes needing a fundi": shows NyumbaHub listings that just became available.
// This page only talks to OUR server (no partner key here). Our server calls NyumbaHub.
// Server on another port (e.g. 5001 on a Mac)? Open the page with ?api=http://localhost:5001
const API_BASE = new URLSearchParams(location.search).get('api') || 'http://localhost:5000';

const statusEl = document.getElementById('oppStatus');
const grid = document.getElementById('oppGrid');
const refreshBtn = document.getElementById('oppRefresh');

const REASON_LABEL = { vacated: 'Just vacated', newly_listed: 'Newly listed' };

// Build cards with textContent only: partner data is never inserted as HTML
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function render(homes) {
  grid.replaceChildren();
  if (homes.length === 0) {
    statusEl.textContent = 'No homes have become available on NyumbaHub recently. Check back later.';
    return;
  }
  statusEl.textContent = `${homes.length} home${homes.length === 1 ? '' : 's'} on NyumbaHub could use a fundi.`;

  for (const h of homes) {
    const card = el('div', 'job-card');

    const top = el('div', 'card-top');
    top.append(el('span', 'card-category', REASON_LABEL[h.reason] || 'Available'));
    top.append(el('span', 'card-urgent', `Listing ${h.listingId}`));
    card.append(top);

    card.append(el('h3', 'card-title', h.suggestedJob));

    const place = [h.area, h.city].filter(Boolean).join(', ');
    card.append(el('p', 'card-location', `📍 ${place || 'Location not available'}`));

    const rooms = (h.bedrooms !== null && h.bathrooms !== null)
      ? `${h.bedrooms} bedroom${h.bedrooms === 1 ? '' : 's'} · ${h.bathrooms} bathroom${h.bathrooms === 1 ? '' : 's'}`
      : 'Size not available';
    card.append(el('p', 'card-duration', `🏠 ${rooms}`));

    const footer = el('div', 'card-footer');
    footer.append(el('span', 'card-location', `Available since ${formatDate(h.availableSince)}`));
    card.append(footer);

    grid.append(card);
  }
}

function showUnavailable() {
  grid.replaceChildren();
  statusEl.textContent = 'NyumbaHub listings are unavailable right now. The rest of FundiLink still works. Try Refresh in a minute.';
  statusEl.classList.add('opp-error');
}

async function loadHomes() {
  statusEl.classList.remove('opp-error');
  statusEl.textContent = 'Loading homes from NyumbaHub… (the first load can take up to a minute if their server is waking up)';
  refreshBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/partner/vacant-homes`);
    if (!res.ok) { showUnavailable(); return; }
    const data = await res.json();
    render(Array.isArray(data.homes) ? data.homes : []);
  } catch {
    // Our own server is unreachable (not running, wrong port)
    showUnavailable();
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadHomes);
loadHomes();
