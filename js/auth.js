// auth.js: login, logout, dan penjaga halaman berdasarkan peran.
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Halaman tujuan untuk tiap peran. Sesuaikan nama file jika berbeda.
const HALAMAN = {
  siswa: "absen.html",
  pembimbing: "dashboard.html",
  admin: "dashboard.html"
};

// Mengambil data akun (nama, peran, aktif) dari koleksi "users".
async function ambilProfil(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// Menerjemahkan kode error Firebase menjadi kalimat yang mudah dipahami.
function pesanError(kode) {
  const daftar = {
    "auth/invalid-credential": "Email atau password salah. Periksa lagi, lalu coba masuk kembali.",
    "auth/invalid-email": "Format email tidak benar. Contoh: nama@sekolah.sch.id",
    "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.",
    "auth/network-request-failed": "Tidak ada koneksi internet. Periksa sinyal, lalu coba lagi.",
    "auth/user-disabled": "Akun ini dinonaktifkan. Hubungi admin."
  };
  return daftar[kode] || "Gagal masuk. Coba lagi, atau hubungi admin jika terus terjadi.";
}

// Mengarahkan pengguna ke halaman sesuai perannya.
async function arahkan(user) {
  const profil = await ambilProfil(user.uid);
  if (!profil) throw new Error("PROFIL_KOSONG");
  if (profil.aktif === false) throw new Error("AKUN_NONAKTIF");
  const tujuan = HALAMAN[profil.role];
  if (!tujuan) throw new Error("PERAN_TIDAK_DIKENAL");
  window.location.href = tujuan;
}

// ---------- Halaman login (index.html) ----------
const form = document.getElementById("form-login");
if (form) {
  const pesan = document.getElementById("pesan");
  const tombol = document.getElementById("tombol-masuk");

  function tampilkan(teks, jenis) {
    pesan.textContent = teks;
    pesan.className = "pesan " + jenis;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    tombol.disabled = true;
    tombol.textContent = "Memeriksa akun...";
    tampilkan("", "");
    try {
      const email = form.email.value.trim();
      const hasil = await signInWithEmailAndPassword(auth, email, form.password.value);
      await arahkan(hasil.user);
    } catch (err) {
      if (err.message === "PROFIL_KOSONG") {
        tampilkan("Akun belum terdaftar di data pengguna. Hubungi admin.", "error");
        await signOut(auth);
      } else if (err.message === "AKUN_NONAKTIF") {
        tampilkan("Akun ini sudah tidak aktif. Hubungi admin.", "error");
        await signOut(auth);
      } else if (err.message === "PERAN_TIDAK_DIKENAL") {
        tampilkan("Peran akun belum diatur. Hubungi admin.", "error");
        await signOut(auth);
      } else {
        tampilkan(pesanError(err.code), "error");
      }
      tombol.disabled = false;
      tombol.textContent = "Masuk";
    }
  });

  // Jika sudah login sebelumnya, langsung arahkan tanpa mengisi form lagi.
  onAuthStateChanged(auth, (user) => {
    if (user && !tombol.disabled) arahkan(user).catch(() => {});
  });
}

// ---------- Dipakai halaman lain ----------
// Panggil di awal tiap halaman, contoh di siswa.html:
//   import { jagaHalaman } from "./auth.js";
//   jagaHalaman(["siswa"], (profil) => { /* tampilkan nama, dll */ });
export function jagaHalaman(peranBoleh, saatSiap) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    const profil = await ambilProfil(user.uid);
    if (!profil || profil.aktif === false || !peranBoleh.includes(profil.role)) {
      window.location.href = "index.html";
      return;
    }
    if (saatSiap) saatSiap({ uid: user.uid, ...profil });
  });
}

// Tombol keluar: <button id="tombol-keluar">Keluar</button>
export async function keluar() {
  await signOut(auth);
  window.location.href = "index.html";
}