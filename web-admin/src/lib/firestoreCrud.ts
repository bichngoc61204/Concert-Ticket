import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const fetchAll = async <T>(col: string, sortField?: string) => {
  const q = sortField ? query(collection(db, col), orderBy(sortField)) : collection(db, col);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
};

export const createDoc = async (col: string, data: Record<string, unknown>) => {
  const payload = { ...data };
  if (!payload.createdAt) payload.createdAt = serverTimestamp();
  return addDoc(collection(db, col), payload);
};

export const updateDocById = async (col: string, id: string, data: Record<string, unknown>) => {
  return updateDoc(doc(db, col, id), data);
};

export const deleteDocById = async (col: string, id: string) => {
  return deleteDoc(doc(db, col, id));
};

