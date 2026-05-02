const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  rooms: {
    getAll: () => ipcRenderer.invoke('rooms:getAll'),
    add: (room) => ipcRenderer.invoke('rooms:add', room),
    update: (id, updates) => ipcRenderer.invoke('rooms:update', { id, updates }),
    delete: (id) => ipcRenderer.invoke('rooms:delete', id),
    addAmenity: (roomId, amenity) => ipcRenderer.invoke('rooms:addAmenity', { roomId, amenity }),
    removeAmenity: (roomId, amenity) => ipcRenderer.invoke('rooms:removeAmenity', { roomId, amenity }),
  },
  guests: {
    getAll: () => ipcRenderer.invoke('guests:getAll'),
    add: (guest) => ipcRenderer.invoke('guests:add', guest),
    update: (id, updates) => ipcRenderer.invoke('guests:update', { id, updates }),
    delete: (id) => ipcRenderer.invoke('guests:delete', id),
    addNote: (guestId, note) => ipcRenderer.invoke('guests:addNote', { guestId, note }),
  },
  bookings: {
    getAll: () => ipcRenderer.invoke('bookings:getAll'),
    add: (booking) => ipcRenderer.invoke('bookings:add', booking),
    update: (id, updates) => ipcRenderer.invoke('bookings:update', { id, updates }),
    delete: (id) => ipcRenderer.invoke('bookings:delete', id),
    addService: (bookingId, service) => ipcRenderer.invoke('bookings:addService', { bookingId, service }),
    updateStatus: (id, status) => ipcRenderer.invoke('bookings:updateStatus', { id, status }),
  },
  reports: {
    revenueByRoomType: () => ipcRenderer.invoke('reports:revenueByRoomType'),
    monthlyBookings: () => ipcRenderer.invoke('reports:monthlyBookings'),
    topGuests: () => ipcRenderer.invoke('reports:topGuests'),
    occupancyByStatus: () => ipcRenderer.invoke('reports:occupancyByStatus'),
    avgStayDuration: () => ipcRenderer.invoke('reports:avgStayDuration'),
    serviceRevenue: () => ipcRenderer.invoke('reports:serviceRevenue'),
    roomTypeCount: () => ipcRenderer.invoke('reports:roomTypeCount'),
  },
  db: {
    seed: () => ipcRenderer.invoke('db:seed'),
    clear: () => ipcRenderer.invoke('db:clear'),
  }
});
