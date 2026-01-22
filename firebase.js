// firebase.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_-SXeXhd1CGI8xbmP8VivChqIwVwJ_5c",
  authDomain: "music-29632.firebaseapp.com",
  projectId: "music-29632",
  storageBucket: "music-29632.firebasestorage.app",
  messagingSenderId: "315237170034",
  appId: "1:315237170034:web:2f761f9eb93cd9fad2bbeb",
  measurementId: "G-6V5QY29EXD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize other Firebase services
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;