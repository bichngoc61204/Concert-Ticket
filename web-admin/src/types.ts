export type City = {
  id: string;
  name: string;
  country?: string;
};

export type EventItem = {
  id: string;
  title: string;
  cityId: string;
  venue?: string;
  date?: string; // ISO date string
  time?: string; // HH:mm
  description?: string;
  bannerUrl?: string;
  imageUrl?: string;
  artists?: string[];
  availableTickets?: number;
};

export type Section = {
  id: string;
  eventId: string;
  name: string;
  price?: number;
  totalSlots?: number;
  availableSlots?: number;
};

export type Order = {
  id: string;
  userId: string;
  eventId: string;
  eventTitle?: string;
  orderId?: string;
  sectionId?: string;
  sectionName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  paymentMethod?: string;
  qrCodeUrl?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};

export type UserDoc = {
  id: string;
  email?: string;
  displayName?: string;
  name?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
};

