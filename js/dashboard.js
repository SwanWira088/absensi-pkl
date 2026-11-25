// dashboard.js
// Halaman pembimbing/admin. Untuk sekarang hanya menampilkan sapaan
// dan menyiapkan tombol keluar. Angka ringkasan belum dihubungkan data.

import { jagaHalaman, keluar } from "./auth.js";

// jagaHalaman akan memeriksa login dan peran sebelum kode di dalam dijalankan.
jagaHalaman(["pembimbing", "admin"], function (profil) {
  document.getElementById("sapa").textContent = "Halo, " + profil.nama;
});

document.getElementById("tombol-keluar").addEventListener("click", keluar);
