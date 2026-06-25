import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCOk_yef2gRBCdm8FwEgeidK7TrK1Yvcd0",
  authDomain: "inter-level-progress-manager.firebaseapp.com",
  projectId: "inter-level-progress-manager",
  storageBucket: "inter-level-progress-manager.firebasestorage.app",
  messagingSenderId: "379503088311",
  appId: "1:379503088311:web:85555d3a6281bb22133332",
  measurementId: "G-XPC2J153VC"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);