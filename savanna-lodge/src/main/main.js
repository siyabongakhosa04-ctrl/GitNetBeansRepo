const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0c1419'
  });
  
  // Load the HTML file
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Uncomment for dev tools
   win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  console.log('🚀 Electron app ready - connecting to backend at ' + API_BASE);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── HELPER: Fetch from API ───────────────────────────────────────
async function apiCall(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(API_BASE + endpoint, options);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch(e) {
    console.error('API call failed:', e.message);
    throw e;
  }
}

// ─── ROOMS ───────────────────────────────────────────────
ipcMain.handle('rooms:getAll', async () => {
  return await apiCall('/rooms');
});

ipcMain.handle('rooms:add', async (_, room) => {
  return await apiCall('/rooms', 'POST', room);
});

ipcMain.handle('rooms:update', async (_, { id, updates }) => {
  return await apiCall(`/rooms/${id}`, 'PUT', updates);
});

ipcMain.handle('rooms:delete', async (_, id) => {
  return await apiCall(`/rooms/${id}`, 'DELETE');
});

ipcMain.handle('rooms:addAmenity', async (_, { roomId, amenity }) => {
  return await apiCall(`/rooms/${roomId}/amenity`, 'POST', { amenity });
});

ipcMain.handle('rooms:removeAmenity', async (_, { roomId, amenity }) => {
  return await apiCall(`/rooms/${roomId}/amenity/${amenity}`, 'DELETE');
});

// ─── GUESTS ──────────────────────────────────────────────
ipcMain.handle('guests:getAll', async () => {
  return await apiCall('/guests');
});

ipcMain.handle('guests:add', async (_, guest) => {
  return await apiCall('/guests', 'POST', guest);
});

ipcMain.handle('guests:update', async (_, { id, updates }) => {
  return await apiCall(`/guests/${id}`, 'PUT', updates);
});

ipcMain.handle('guests:delete', async (_, id) => {
  return await apiCall(`/guests/${id}`, 'DELETE');
});

ipcMain.handle('guests:addNote', async (_, { guestId, note }) => {
  return await apiCall(`/guests/${guestId}/note`, 'POST', { text: note });
});

// ─── BOOKINGS ─────────────────────────────────────────────
ipcMain.handle('bookings:getAll', async () => {
  return await apiCall('/bookings');
});

ipcMain.handle('bookings:add', async (_, booking) => {
  return await apiCall('/bookings', 'POST', booking);
});

ipcMain.handle('bookings:update', async (_, { id, updates }) => {
  return await apiCall(`/bookings/${id}`, 'PUT', updates);
});

ipcMain.handle('bookings:delete', async (_, id) => {
  return await apiCall(`/bookings/${id}`, 'DELETE');
});

ipcMain.handle('bookings:addService', async (_, { bookingId, service }) => {
  return await apiCall(`/bookings/${bookingId}/service`, 'POST', service);
});

ipcMain.handle('bookings:updateStatus', async (_, { id, status }) => {
  return await apiCall(`/bookings/${id}/status`, 'PATCH', { status });
});

// ─── DB OPERATIONS ────────────────────────────────────────
ipcMain.handle('db:seed', async () => {
  return await apiCall('/db/seed', 'POST');
});

ipcMain.handle('db:clear', async () => {
  return await apiCall('/db/clear', 'DELETE');
});

// ─── REPORTS (fetch from API) ─────────────────────────────

ipcMain.handle('reports:revenueByRoomType', async () => {
  try {
    const bookings = await apiCall('/bookings');
    const revByType = {};
    bookings
      .filter(b => ['confirmed', 'checked-out'].includes(b.status))
      .forEach(b => {
        const key = b.roomType || 'Unknown';
        if (!revByType[key]) revByType[key] = { totalRevenue: 0, totalBookings: 0, avgAmount: 0 };
        revByType[key].totalRevenue += b.totalAmount || 0;
        revByType[key].totalBookings += 1;
      });
    return Object.entries(revByType).map(([_id, val]) => ({
      _id,
      totalRevenue: val.totalRevenue,
      totalBookings: val.totalBookings,
      avgAmount: val.totalRevenue / val.totalBookings
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  } catch(e) { 
    console.error(e); 
    return []; 
  }
});

ipcMain.handle('reports:monthlyBookings', async () => {
  try {
    const bookings = await apiCall('/bookings');
    const monthly = {};
    bookings.forEach(b => {
      const month = b.checkIn?.substring(0, 7) || '2024-01';
      if (!monthly[month]) monthly[month] = { count: 0, revenue: 0 };
      monthly[month].count += 1;
      monthly[month].revenue += b.totalAmount || 0;
    });
    return Object.entries(monthly).map(([_id, val]) => ({
      _id,
      count: val.count,
      revenue: val.revenue
    })).sort((a, b) => a._id.localeCompare(b._id));
  } catch(e) { 
    console.error(e); 
    return []; 
  }
});

ipcMain.handle('reports:topGuests', async () => {
  try {
    const bookings = await apiCall('/bookings');
    const topGuests = {};
    bookings
      .filter(b => ['confirmed', 'checked-out'].includes(b.status))
      .forEach(b => {
        if (!topGuests[b.guestId]) {
          topGuests[b.guestId] = { guestName: b.guestName, totalStays: 0, totalSpent: 0 };
        }
        topGuests[b.guestId].totalStays += 1;
        topGuests[b.guestId].totalSpent += b.totalAmount || 0;
      });
    return Object.entries(topGuests)
      .map(([_id, val]) => ({ _id, ...val }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  } catch(e) { 
    console.error(e); 
    return []; 
  }
});

ipcMain.handle('reports:occupancyByStatus', async () => {
  try {
    const bookings = await apiCall('/bookings');
    const statusCounts = {};
    bookings.forEach(b => {
      const status = b.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([_id, count]) => ({ _id, count }));
  } catch(e) { 
    console.error(e); 
    return []; 
  }
});

ipcMain.handle('reports:avgStayDuration', async () => {
  try {
    const bookings = await apiCall('/bookings');
    const avgStay = {};
    bookings
      .filter(b => b.nights && b.nights > 0)
      .forEach(b => {
        const key = b.roomType || 'Unknown';
        if (!avgStay[key]) avgStay[key] = { totalNights: 0, count: 0 };
        avgStay[key].totalNights += b.nights;
        avgStay[key].count += 1;
      });
    return Object.entries(avgStay)
      .map(([_id, val]) => ({
        _id,
        avgNights: val.totalNights / val.count,
        count: val.count
      }))
      .sort((a, b) => b.avgNights - a.avgNights);
  } catch(e) { 
    console.error(e); 
    return []; 
  }
});

ipcMain.handle('reports:serviceRevenue', async () => {
  try {
    const bookings = await apiCall('/bookings');
    const svcRev = {};
    bookings.forEach(b => {
      (b.services || []).forEach(s => {
        if (!svcRev[s.name]) svcRev[s.name] = { totalRevenue: 0, count: 0 };
        svcRev[s.name].totalRevenue += s.price || 0;
        svcRev[s.name].count += 1;
      });
    });
    return Object.entries(svcRev)
      .map(([_id, val]) => ({
        _id,
        totalRevenue: val.totalRevenue,
        count: val.count
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  } catch(e) { 
    console.error(e); 
    return []; 
  }
});

ipcMain.handle('reports:roomTypeCount', async () => {
  try {
    const rooms = await apiCall('/rooms');
    const roomTypes = {};
    rooms.forEach(r => {
      const key = r.type || 'Unknown';
      if (!roomTypes[key]) roomTypes[key] = { count: 0, totalPrice: 0 };
      roomTypes[key].count += 1;
      roomTypes[key].totalPrice += r.pricePerNight || 0;
    });
    return Object.entries(roomTypes)
      .map(([_id, val]) => ({
        _id,
        count: val.count,
        avgPrice: val.totalPrice / val.count
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice);
  } catch(e) { 
    console.error(e); 
    return []; 
  }
});