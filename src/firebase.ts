/**
 * CONFIGURAÇÃO DO FIREBASE - REAL SHOP ANGOLA
 * 
 * 1. Vá para o Console do Firebase (https://console.firebase.google.com/)
 * 2. Ative o 'Phone Authentication' em Authentication > Sign-in method.
 * 3. Ative o 'Cloud Firestore' em Firestore Database.
 * 4. Adicione um App Web e copie as credenciais para o seu arquivo .env ou Secrets.
 * 5. Adicione o domínio do seu site em Authentication > Settings > Authorized Domains.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDlVmTMm8NA2MkRb0xS-eQHNDPQR-B9_qs",
  authDomain: "real-shop-angola.firebaseapp.com",
  projectId: "loja-real-angola",
  storageBucket: "real-shop-angola.firebasestorage.app",
  messagingSenderId: "810301157275",
  appId: "1:810301157275:web:c80ea25fa3c92a39e33b3e",
  measurementId: "G-6CBVVW7BKE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
