import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCuRLeeClxqwixqwCcJ16oTXHDlt95jRWc",
  authDomain: "absensi-pkl-df022.firebaseapp.com",
  projectId: "absensi-pkl-df022",
  storageBucket: "absensi-pkl-df022.firebasestorage.app",
  messagingSenderId: "641514091141",
  appId: "1:641514091141:web:11023ce35a547375516fec",
  measurementId: "G-Z2J3L6QB9X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);