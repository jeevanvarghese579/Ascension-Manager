import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCOk_yef2gRBCdm8FwEgeidK7TrK1Yvcd0",
  authDomain: "inter-level-progress-manager.firebaseapp.com",
  projectId: "inter-level-progress-manager",
  storageBucket: "inter-level-progress-manager.firebasestorage.app",
  messagingSenderId: "379503088311",
  appId: "1:379503088311:web:7b5117cc3447eded133332",
  measurementId: "G-JRX8DC5QGC"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
