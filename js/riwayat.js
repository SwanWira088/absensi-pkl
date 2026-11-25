// riwayat.js
// Menampilkan seluruh riwayat kehadiran siswa, dari tanggal terbaru.

import { db } from "./firebase-config.js";
import { jagaHalaman } from "./auth.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Cara singkat mengambil elemen berdasarkan id.
function ambil(id) {
  return document.getElementById(id);
}

function duaAngka(angka) {
  return String(angka).padStart(2, "0"); // 5 menjadi "05"
}

function formatJam(waktu) {
  if (!waktu) return "-"; // izin/sakit tidak punya jam masuk
  const tanggal = waktu.toDate();
  return duaAngka(tanggal.getHours()) + ":" + duaAngka(tanggal.getMinutes());
}

async function muatRiwayat(uid) {
  const daftar = ambil("daftar");
  daftar.innerHTML = ""; // kosongkan dulu agar tidak dobel saat dimuat ulang

  try {
    // Ambil hanya data milik siswa yang sedang login.
    const hasil = await getDocs(
      query(collection(db, "attendance"), where("uid", "==", uid))
    );

    const data = hasil.docs.map(function (dokumen) {
      return dokumen.data();
    });

    // Urutkan tanggal terbaru di atas.
    data.sort(function (a, b) {
      return b.tanggal.localeCompare(a.tanggal);
    });

    if (data.length === 0) {
      const kosong = document.createElement("li");
      kosong.className = "kosong";
      kosong.textContent = "Belum ada riwayat kehadiran.";
      daftar.appendChild(kosong);
      return;
    }

    data.forEach(function (d) {
      const baris = document.createElement("li");

      const kiri = document.createElement("span");
      kiri.textContent = d.tanggal + " - masuk " + formatJam(d.checkIn) +
        " pulang " + formatJam(d.checkOut);

      const label = document.createElement("span");
      label.className = "tag " + d.status;
      label.textContent = d.status;

      baris.appendChild(kiri);
      baris.appendChild(label);
      daftar.appendChild(baris);
    });
  } catch (e) {
    console.error(e);
    const gagal = document.createElement("li");
    gagal.className = "kosong";
    gagal.textContent = "Gagal memuat riwayat: " + e.message;
    daftar.appendChild(gagal);
  }
}

// Pakai penjaga yang sama seperti halaman lain.
jagaHalaman(["siswa"], function (profil) {
  muatRiwayat(profil.uid);
});
