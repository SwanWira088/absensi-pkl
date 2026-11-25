// firebase-config.js
// Penghubung halaman web ke proyek Firebase.
// File ini tidak mengatur tampilan, hanya menyiapkan auth dan database.

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Data proyek. Nilainya sudah sesuai dengan project Firebase kelas.
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

export const auth = getAuth(app); // dipakai untuk login/logout
export const db = getFirestore(app); // dipakai untuk menyimpan absen
