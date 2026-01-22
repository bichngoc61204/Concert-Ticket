import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyC_-SXeXhd1CGI8xbmP8VivChqIwVwJ_5c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "music-29632.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "music-29632",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "music-29632.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "315237170034",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:315237170034:web:2f761f9eb93cd9fad2bbeb",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

