// auth.js
// Tiga tugas utama: masuk, keluar, dan menjaga halaman sesuai peran.
// Dipakai bersama oleh index.html dan semua halaman setelah login.

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Tujuan setelah login. Sesuaikan nama file jika anggota tim mengubahnya.
const HALAMAN_PERAN = {
  siswa: "absen.html",
  pembimbing: "dashboard.html",
  admin: "dashboard.html"
};

// Data akun (nama, peran, status aktif) disimpan di koleksi "users".
async function ambilProfil(uid) {
  const hasil = await getDoc(doc(db, "users", uid));
  return hasil.exists() ? hasil.data() : null;
}

// Kode error Firebase diterjemahkan jadi kalimat yang enak dibaca.
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

async function arahkan(user) {
  const profil = await ambilProfil(user.uid);

  if (!profil) throw new Error("PROFIL_KOSONG");
  if (profil.aktif === false) throw new Error("AKUN_NONAKTIF");

  const tujuan = HALAMAN_PERAN[profil.role];
  if (!tujuan) throw new Error("PERAN_TIDAK_DIKENAL");

  window.location.href = tujuan;
}


// ---------- HALAMAN LOGIN (index.html) ----------

const form = document.getElementById("form-login");

if (form) {
  const pesan = document.getElementById("pesan");
  const tombol = document.getElementById("tombol-masuk");

  function tampilkan(teks, jenis) {
    pesan.textContent = teks;
    pesan.className = "pesan " + jenis;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault(); // halaman tidak di-refresh saat form dikirim

    tombol.disabled = true;
    tombol.textContent = "Memeriksa akun...";
    tampilkan("", "");

    // Pesan untuk masalah yang berasal dari aplikasi kita sendiri.
    const pesanKhusus = {
      PROFIL_KOSONG: "Akun belum terdaftar di data pengguna. Hubungi admin.",
      AKUN_NONAKTIF: "Akun ini sudah tidak aktif. Hubungi admin.",
      PERAN_TIDAK_DIKENAL: "Peran akun belum diatur. Hubungi admin."
    };

    try {
      const email = form.email.value.trim();
      const hasil = await signInWithEmailAndPassword(
        auth,
        email,
        form.password.value
      );
      await arahkan(hasil.user);
    } catch (err) {
      if (pesanKhusus[err.message]) {
        tampilkan(pesanKhusus[err.message], "error");
        await signOut(auth);
      } else {
        tampilkan(pesanError(err.code), "error");
      }

      tombol.disabled = false;
      tombol.textContent = "Masuk";
    }
  });

  // Jika sudah login dari sesi sebelumnya, langsung arahkan.
  onAuthStateChanged(auth, function (user) {
    if (user && !tombol.disabled) {
      arahkan(user).catch(function () {});
    }
  });
}


// ---------- DIPAKAI HALAMAN LAIN ----------

// Contoh pemakaian di halaman siswa:
//   jagaHalaman(["siswa"], function (profil) { ... });
export function jagaHalaman(peranBoleh, saatSiap) {
  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const profil = await ambilProfil(user.uid);

    if (!profil || profil.aktif === false || !peranBoleh.includes(profil.role)) {
      window.location.href = "index.html";
      return;
    }

    profil.uid = user.uid;
    if (saatSiap) saatSiap(profil);
  });
}

export async function keluar() {
  await signOut(auth);
  window.location.href = "index.html";
}
