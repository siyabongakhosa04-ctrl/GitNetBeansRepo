// ── State ──────────────────────────────────────────────
let state = { rooms: [], guests: [], bookings: [] };
let currentPage = 'dashboard';

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  await loadAll();
  renderPage('dashboard');
  
  document.getElementById('seedBtn').addEventListener('click', async () => {
    const res = await window.api.db.seed();
    toast(res.message, 'success');
    await loadAll();
    renderPage(currentPage);
  });
  
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!confirm('Clear ALL data from the database?')) return;
    await window.api.db.clear();
    toast('Database cleared');
    await loadAll();
    renderPage(currentPage);
  });
  
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
});

async function loadAll() {
  try {
    const [rooms, guests, bookings] = await Promise.all([
      window.api.rooms.getAll(),
      window.api.guests.getAll(),
      window.api.bookings.getAll()
    ]);
    state = { rooms, guests, bookings };
  } catch(e) {
    toast('Failed to load data', 'error');
  }
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPage = btn.dataset.page;
      renderPage(currentPage);
    });
  });
}

function renderPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  const fn = { dashboard, rooms, guests, bookings, reports }[page];
  if (fn) fn();
}

// ── DASHBOARD ──────────────────────────────────────────
function dashboard() {
  const el = document.getElementById('page-dashboard');
  const revenue = state.bookings.filter(b => ['confirmed','checked-out'].includes(b.status)).reduce((s,b) => s + (b.totalAmount||0), 0);
  const active = state.bookings.filter(b => b.status === 'confirmed').length;
  const avail = state.rooms.filter(r => r.status === 'available').length;
  const recent = [...state.bookings].slice(0, 6);
  const roomsByStatus = { available: 0, occupied: 0, maintenance: 0 };
  state.rooms.forEach(r => { if (roomsByStatus[r.status] !== undefined) roomsByStatus[r.status]++; });

  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Dashboard</div><div class="page-sub">Live overview of lodge operations</div></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">R${(revenue/1000).toFixed(1)}k</div>
        <div class="stat-sub">Confirmed + checked-out</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5896d4" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg></div>
        <div class="stat-label">Active Bookings</div>
        <div class="stat-value">${active}</div>
        <div class="stat-sub">Currently confirmed</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52c47a" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg></div>
        <div class="stat-label">Available Rooms</div>
        <div class="stat-value">${avail}</div>
        <div class="stat-sub">Of ${state.rooms.length} total</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9068d0" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="stat-label">Guests</div>
        <div class="stat-value">${state.guests.length}</div>
        <div class="stat-sub">Registered profiles</div>
      </div>
    </div>
    <div class="dash-grid">
      <div class="card">
        <div class="section-title">Recent Bookings</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Room</th><th>Check-in</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>${recent.length ? recent.map(b => `
            <tr>
              <td><strong>${b.guestName}</strong></td>
              <td>Rm ${b.roomNumber} <span style="color:var(--text-3)">${b.roomType}</span></td>
              <td>${b.checkIn}</td>
              <td class="text-gold">R${(b.totalAmount||0).toLocaleString()}</td>
              <td>${statusBadge(b.status)}</td>
            </tr>`).join('') : `<tr><td colspan="5" class="empty">No bookings yet</td></tr>`}
          </tbody>
        </table></div>
      </div>
      <div class="card">
        <div class="section-title">Room Status</div>
        <div class="status-row">
          ${Object.entries(roomsByStatus).map(([s,c]) => `
            <div class="room-pill">
              <div class="room-pill-num">${c}</div>
              <div class="room-pill-label">${s}</div>
            </div>`).join('')}
        </div>
        <hr class="divider">
        <div class="section-title">Top Guests</div>
        ${state.guests.slice(0,4).map(g => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--gold)">${g.firstName[0]}${g.lastName[0]}</div>
            <div>
              <div style="font-size:13px">${g.firstName} ${g.lastName}</div>
              <div style="font-size:11px;color:var(--text-3)">${g.loyaltyPoints||0} loyalty pts</div>
            </div>
            <div style="margin-left:auto;font-size:11px;color:var(--text-2)">${g.nationality||''}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── ROOMS ──────────────────────────────────────────────
function rooms() {
  const el = document.getElementById('page-rooms');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Rooms</div><div class="page-sub">Inventory & management</div></div>
      <button class="btn btn-primary" onclick="showAddRoom()">+ Add Room</button>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Room</th><th>Type</th><th>Floor</th><th>Price/Night</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${state.rooms.length ? state.rooms.map(r => `
          <tr>
            <td><strong>${r.number}</strong></td>
            <td>${r.type}</td>
            <td>${r.floor}</td>
            <td>R${(r.pricePerNight||0).toLocaleString()}</td>
            <td>${r.capacity}</td>
            <td>${roomStatusBadge(r.status)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteRoom('${r._id}')">Delete</button></td>
          </tr>`).join('') : `<tr><td colspan="7" class="empty">No rooms found</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

function showAddRoom() {
  openModal('Add Room', `
    <div class="form-grid">
      <div class="form-group"><label>Number</label><input id="f-number" placeholder="101"></div>
      <div class="form-group"><label>Type</label><select id="f-type"><option>Standard</option><option>Deluxe</option><option>Suite</option><option>Family</option></select></div>
      <div class="form-group"><label>Floor</label><input id="f-floor" type="number" value="1"></div>
      <div class="form-group"><label>Price/Night</label><input id="f-price" type="number" value="850"></div>
      <div class="form-group"><label>Capacity</label><input id="f-capacity" type="number" value="2"></div>
      <div class="form-group"><label>Status</label><select id="f-status"><option>available</option><option>occupied</option><option>maintenance</option></select></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" onclick="saveRoom()">Save</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveRoom() {
  try {
    await window.api.rooms.add({
      number: v('f-number'),
      type: v('f-type'),
      floor: parseInt(v('f-floor')),
      pricePerNight: parseInt(v('f-price')),
      capacity: parseInt(v('f-capacity')),
      status: v('f-status'),
      amenities: [],
      maintenanceLog: [],
      images: []
    });
    toast('Room added', 'success');
    closeModal();
    await loadAll();
    rooms();
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteRoom(id) {
  if (!confirm('Delete?')) return;
  try {
    await window.api.rooms.delete(id);
    toast('Room deleted', 'success');
    await loadAll();
    rooms();
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ── GUESTS ─────────────────────────────────────────────
function guests() {
  const el = document.getElementById('page-guests');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Guests</div><div class="page-sub">Profiles & history</div></div>
      <button class="btn btn-primary" onclick="showAddGuest()">+ Add Guest</button>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Nationality</th><th>Loyalty Points</th><th>Actions</th></tr></thead>
        <tbody>${state.guests.length ? state.guests.map(g => `
          <tr>
            <td><strong>${g.firstName} ${g.lastName}</strong></td>
            <td>${g.email}</td>
            <td>${g.phone}</td>
            <td>${g.nationality}</td>
            <td class="text-gold">${g.loyaltyPoints||0}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteGuest('${g._id}')">Delete</button></td>
          </tr>`).join('') : `<tr><td colspan="6" class="empty">No guests found</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

function showAddGuest() {
  openModal('Add Guest', `
    <div class="form-grid">
      <div class="form-group"><label>First Name</label><input id="f-fname"></div>
      <div class="form-group"><label>Last Name</label><input id="f-lname"></div>
      <div class="form-group"><label>Email</label><input id="f-email" type="email"></div>
      <div class="form-group"><label>Phone</label><input id="f-phone"></div>
      <div class="form-group"><label>Nationality</label><input id="f-nationality"></div>
      <div class="form-group"><label>ID Number</label><input id="f-id"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" onclick="saveGuest()">Save</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveGuest() {
  try {
    await window.api.guests.add({
      firstName: v('f-fname'),
      lastName: v('f-lname'),
      email: v('f-email'),
      phone: v('f-phone'),
      idNumber: v('f-id'),
      nationality: v('f-nationality'),
      address: { city: '', country: '' },
      preferences: [],
      loyaltyPoints: 0,
      notes: [],
      createdAt: new Date()
    });
    toast('Guest added', 'success');
    closeModal();
    await loadAll();
    guests();
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteGuest(id) {
  if (!confirm('Delete?')) return;
  try {
    await window.api.guests.delete(id);
    toast('Guest deleted', 'success');
    await loadAll();
    guests();
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ── BOOKINGS ───────────────────────────────────────────
function bookings() {
  const el = document.getElementById('page-bookings');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Bookings</div><div class="page-sub">Reservations & check-ins</div></div>
      <button class="btn btn-primary" onclick="showAddBooking()">+ New Booking</button>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${state.bookings.length ? state.bookings.map(b => `
          <tr>
            <td><strong>${b.guestName}</strong></td>
            <td>Rm ${b.roomNumber}</td>
            <td>${b.checkIn}</td>
            <td>${b.checkOut}</td>
            <td class="text-gold">R${(b.totalAmount||0).toLocaleString()}</td>
            <td>${statusBadge(b.status)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteBooking('${b._id}')">Delete</button></td>
          </tr>`).join('') : `<tr><td colspan="7" class="empty">No bookings found</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
}

function showAddBooking() {
  openModal('New Booking', `
    <div class="form-grid">
      <div class="form-group"><label>Guest Name</label><input id="f-guestname"></div>
      <div class="form-group"><label>Room Number</label><input id="f-roomnumber"></div>
      <div class="form-group"><label>Room Type</label><input id="f-roomtype" value="Standard"></div>
      <div class="form-group"><label>Check-in</label><input id="f-checkin" type="date"></div>
      <div class="form-group"><label>Check-out</label><input id="f-checkout" type="date"></div>
      <div class="form-group"><label>Price/Night</label><input id="f-price" type="number" value="850"></div>
      <div class="form-group"><label>Status</label><select id="f-status"><option>pending</option><option>confirmed</option><option>checked-out</option></select></div>
      <div class="form-group"><label>Payment</label><input id="f-payment" placeholder="Credit Card"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" onclick="saveBooking()">Save</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveBooking() {
  const checkIn = new Date(v('f-checkin'));
  const checkOut = new Date(v('f-checkout'));
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const price = parseInt(v('f-price')) || 850;
  
  try {
    await window.api.bookings.add({
      guestName: v('f-guestname'),
      roomNumber: v('f-roomnumber'),
      roomType: v('f-roomtype'),
      checkIn: v('f-checkin'),
      checkOut: v('f-checkout'),
      nights: nights,
      pricePerNight: price,
      totalAmount: nights * price,
      status: v('f-status'),
      paymentMethod: v('f-payment'),
      specialRequests: '',
      services: [],
      createdAt: new Date()
    });
    toast('Booking added', 'success');
    closeModal();
    await loadAll();
    bookings();
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteBooking(id) {
  if (!confirm('Delete?')) return;
  try {
    await window.api.bookings.delete(id);
    toast('Booking deleted', 'success');
    await loadAll();
    bookings();
  } catch(e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ── REPORTS ───────────────────────────────────────────
async function reports() {
  const el = document.getElementById('page-reports');
  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">Reports & Analytics</div><div class="page-sub">Business intelligence</div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Revenue by Room Type</div>
        <div class="bar-chart" id="chart-rev"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Top Guests by Spending</div>
        <div class="bar-chart" id="chart-top"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Avg Stay by Room Type</div>
        <div class="bar-chart" id="chart-avg"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Room Inventory</div>
        <div class="bar-chart" id="chart-rooms"></div>
      </div>
    </div>`;

  // Load report data
  try {
    const [rev, topGuests, avgStay, roomCounts] = await Promise.all([
      window.api.reports.revenueByRoomType(),
      window.api.reports.topGuests(),
      window.api.reports.avgStayDuration(),
      window.api.reports.roomTypeCount()
    ]);

    requestAnimationFrame(() => {
      const maxRevAll = Math.max(...rev.map(r => r.totalRevenue), 1);
      const maxTop = Math.max(...topGuests.map(g => g.totalSpent || 0), 1);
      const maxAvg = Math.max(...avgStay.map(s => s.avgNights || 0), 1);
      const maxRC = Math.max(...roomCounts.map(r => r.count || 0), 1);

      renderBars('chart-rev', rev.map(r => ({
        label: r._id, val: r.totalRevenue, max: maxRevAll,
        display: `R${(r.totalRevenue/1000).toFixed(1)}k`, colorClass: 'bar-fill-gold',
        sub: `${r.totalBookings} bookings`
      })));

      renderBars('chart-top', topGuests.map(g => ({
        label: g.guestName || 'Guest', val: g.totalSpent || 0, max: maxTop,
        display: `R${((g.totalSpent||0)/1000).toFixed(1)}k`, colorClass: 'bar-fill-blue',
        sub: `${g.totalStays} stays`
      })));

      renderBars('chart-avg', avgStay.map(s => ({
        label: s._id, val: s.avgNights || 0, max: maxAvg,
        display: `${(s.avgNights||0).toFixed(1)} nights`, colorClass: 'bar-fill-amber',
        sub: `${s.count} bookings`
      })));

      renderBars('chart-rooms', roomCounts.map(r => ({
        label: r._id, val: r.count || 0, max: maxRC,
        display: `${r.count} rooms`, colorClass: 'bar-fill-purple',
        sub: `avg R${Math.round(r.avgPrice||0).toLocaleString()}/night`
      })));
    });
  } catch(e) {
    el.innerHTML += `<div class="card"><p style="color: red;">Error loading reports: ${e.message}</p></div>`;
  }
}

function renderBars(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) { el.innerHTML = `<div class="empty">No data</div>`; return; }
  el.innerHTML = items.map(item => `
    <div>
      <div class="bar-row">
        <div class="bar-label" title="${item.label}">${item.label}</div>
        <div class="bar-track"><div class="bar-fill ${item.colorClass}" data-w="${(item.val/item.max*100).toFixed(1)}"></div></div>
        <div class="bar-val">${item.display}</div>
      </div>
      ${item.sub ? `<div class="bar-sub">${item.sub}</div>` : ''}
    </div>`).join('');
  setTimeout(() => {
    el.querySelectorAll('.bar-fill[data-w]').forEach(fill => {
      fill.style.width = fill.dataset.w + '%';
    });
  }, 60);
}

// ── HELPERS ────────────────────────────────────────────
function v(id) { return document.getElementById(id)?.value || ''; }

function statusBadge(s) {
  const m = { confirmed:'green', 'checked-out':'blue', pending:'amber', cancelled:'red', 'checked-in':'purple' };
  return `<span class="badge badge-${m[s]||'grey'}">${s}</span>`;
}

function roomStatusBadge(s) {
  const m = { available:'green', occupied:'amber', maintenance:'red' };
  return `<span class="badge badge-${m[s]||'grey'}">${s}</span>`;
}

function openModal(title, body) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3200);
}