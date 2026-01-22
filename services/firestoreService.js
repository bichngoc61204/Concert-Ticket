import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';

// Users Collection
const usersRef = collection(db, 'users');

export const createUser = async (userId, userData) => {
  try {
    await setDoc(doc(usersRef, userId), {
      ...userData,
      createdAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating user: ", error);
    return { success: false, error };
  }
};

export const getUser = async (userId) => {
  try {
    const userDoc = await getDoc(doc(usersRef, userId));
    if (userDoc.exists()) {
      return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
    } else {
      return { success: false, error: "User not found" };
    }
  } catch (error) {
    console.error("Error getting user: ", error);
    return { success: false, error };
  }
};

// Cities Collection
export const getCities = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'cities'));
    const cities = [];
    querySnapshot.forEach((doc) => {
      cities.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: cities };
  } catch (error) {
    console.error("Error getting cities: ", error);
    return { success: false, error };
  }
};

// Events Collection
export const getEventsByCity = async (cityId) => {
  try {
    const q = query(collection(db, 'events'), where('cityId', '==', cityId));
    const querySnapshot = await getDocs(q);
    const events = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: events };
  } catch (error) {
    console.error("Error getting events: ", error);
    return { success: false, error };
  }
};

export const getEventById = async (eventId) => {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (eventDoc.exists()) {
      return { success: true, data: { id: eventDoc.id, ...eventDoc.data() } };
    } else {
      return { success: false, error: "Event not found" };
    }
  } catch (error) {
    console.error("Error getting event: ", error);
    return { success: false, error };
  }
};

// Sections Collection
export const getSectionsByEvent = async (eventId) => {
  try {
    const q = query(collection(db, 'sections'), where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    const sections = [];
    querySnapshot.forEach((doc) => {
      sections.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: sections };
  } catch (error) {
    console.error("Error getting sections: ", error);
    return { success: false, error };
  }
};

// Orders Collection
export const createOrder = async (orderData) => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      qrData: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Timestamp.now(),
    });
    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error("Error creating order: ", error);
    return { success: false, error };
  }
};

export const getUserOrders = async (userId) => {
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: orders };
  } catch (error) {
    console.error("Error getting user orders: ", error);
    return { success: false, error };
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating order status: ", error);
    return { success: false, error };
  }
};

export const getOrderById = async (orderId) => {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (orderDoc.exists()) {
      return { success: true, data: { id: orderDoc.id, ...orderDoc.data() } };
    } else {
      return { success: false, error: "Order not found" };
    }
  } catch (error) {
    console.error("Error getting order: ", error);
    return { success: false, error };
  }
};
