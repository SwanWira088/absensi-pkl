// presensi.js
// Fitur harian siswa: check-in, check-out, izin/sakit, dan 5 riwayat terakhir.
// Login tidak dibuat di sini. Kita memakai penjaga dari auth.js.

import { db } from "./firebase-config.js";
import { jagaHalaman, keluar } from "./auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Cara singkat mengambil elemen berdasarkan id.
function ambil(id) {
  return document.getElementById(id);
}

function duaAngka(angka) {
  return String(angka).padStart(2, "0"); // 5 menjadi "05"
}

let uid = null;       // id siswa yang sedang login
let dataSaya = [];    // semua data absen milik siswa tersebut


// ---------- 1. FUNGSI TANGGAL DAN WAKTU ----------

function tanggalHariIni() {
  const d = new Date();
  return d.getFullYear() + "-" + duaAngka(d.getMonth() + 1) +
    "-" + duaAngka(d.getDate()); // contoh: "2026-11-25"
}

function jamSekarang() {
  const d = new Date();
  return duaAngka(d.getHours()) + ":" + duaAngka(d.getMinutes()); // "09:55"
}

// Waktu dari Firestore diubah dulu menjadi jam "09:55".
function formatJam(waktu) {
  if (!waktu) return "-";
  const d = waktu.toDate();
  return duaAngka(d.getHours()) + ":" + duaAngka(d.getMinutes());
}


// ---------- 2. TEKS DI LAYAR ----------

function tulisPesan(teks) {
  ambil("pesan").textContent = teks;
}

function aturStatus(label, detail, kelas) {
  const status = ambil("status");
  status.textContent = label;
  status.className = "badge " + kelas;
  ambil("detailStatus").textContent = detail;
}

// Jam di kartu hanya penunjuk waktu. Yang disimpan tetap waktu server.
function perbaruiJam() {
  const d = new Date();
  ambil("tanggal").textContent = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  ambil("jam").textContent = duaAngka(d.getHours()) + ":" +
    duaAngka(d.getMinutes()) + ":" + duaAngka(d.getSeconds());
}

perbaruiJam();
setInterval(perbaruiJam, 1000);


// ---------- 3. MENAMPILKAN STATUS HARI INI DAN RIWAYAT ----------

function tampilkan() {
  const hari = dataSaya.find(function (d) {
    return d.tanggal === tanggalHariIni();
  });

  if (!hari) {
    // Belum ada data hari ini.
    aturStatus("Belum check-in", "Tekan tombol di bawah saat kamu tiba di tempat PKL.", "belum");
    ambil("btnCheckIn").disabled = false;
    ambil("btnCheckOut").disabled = true;
  } else if (hari.status === "izin" || hari.status === "sakit") {
    aturStatus(hari.status, "Keterangan: " + (hari.keterangan || "-"), hari.status);
    ambil("btnCheckIn").disabled = true;
    ambil("btnCheckOut").disabled = true;
  } else if (!hari.checkOut) {
    aturStatus(hari.status, "Check-in pukul " + formatJam(hari.checkIn), hari.status);
    ambil("btnCheckIn").disabled = true;
    ambil("btnCheckOut").disabled = false;
  } else {
    aturStatus(
      "Selesai",
      "Masuk " + formatJam(hari.checkIn) + ", pulang " + formatJam(hari.checkOut),
      "selesai"
    );
    ambil("btnCheckIn").disabled = true;
    ambil("btnCheckOut").disabled = true;
  }

  // Riwayat 5 hari terakhir.
  const daftar = ambil("riwayat");
  daftar.innerHTML = "";

  const terbaru = dataSaya.slice()
    .sort(function (a, b) {
      return b.tanggal.localeCompare(a.tanggal);
    })
    .slice(0, 5);

  if (terbaru.length === 0) {
    const kosong = document.createElement("li");
    kosong.className = "kosong";
    kosong.textContent = "Belum ada riwayat";
    daftar.appendChild(kosong);
  }

  terbaru.forEach(function (d) {
    const baris = document.createElement("li");

    const kiri = document.createElement("span");
    kiri.textContent = d.tanggal + " · " + formatJam(d.checkIn);

    const label = document.createElement("span");
    label.className = "tag " + d.status;
    label.textContent = d.status;

    baris.appendChild(kiri);
    baris.appendChild(label);
    daftar.appendChild(baris);
  });
}


// ---------- 4. AMBIL DATA DARI FIRESTORE ----------

async function muatData() {
  try {
    const hasil = await getDocs(
      query(collection(db, "attendance"), where("uid", "==", uid))
    );

    dataSaya = hasil.docs.map(function (dokumen) {
      return dokumen.data();
    });

    tampilkan();
  } catch (e) {
    console.error(e);
    aturStatus("Gagal memuat", e.message, "belum");
    tulisPesan("Gagal memuat data: " + e.message);
  }
}


// ---------- 5. CHECK-IN ----------

async function checkIn() {
  ambil("btnCheckIn").disabled = true;

  try {
    // Batas terlambat diambil dari pengaturan, bukan dari HP.
    const pengaturan = (await getDoc(doc(db, "settings", "config"))).data();
    const status = jamSekarang() > pengaturan.batasTerlambat
      ? "terlambat"
      : "hadir";

    await setDoc(doc(db, "attendance", uid + "_" + tanggalHariIni()), {
      uid: uid,
      tanggal: tanggalHariIni(),
      checkIn: serverTimestamp(), // waktu server, bukan jam perangkat
      checkOut: null,
      status: status,
      keterangan: ""
    });

    tulisPesan("Check-in berhasil.");
  } catch (e) {
    console.error(e);
    tulisPesan(
      e.code === "permission-denied"
        ? "Check-in ditolak. Kamu mungkin sudah absen hari ini."
        : "Gagal check-in: " + e.message
    );
  }

  await muatData();
}


// ---------- 6. CHECK-OUT ----------

async function checkOut() {
  ambil("btnCheckOut").disabled = true;

  try {
    await updateDoc(doc(db, "attendance", uid + "_" + tanggalHariIni()), {
      checkOut: serverTimestamp()
    });
    tulisPesan("Check-out berhasil. Sampai besok!");
  } catch (e) {
    console.error(e);
    tulisPesan("Gagal check-out: " + e.message);
  }

  await muatData();
}


// ---------- 7. IZIN DAN SAKIT ----------

async function ajukan(jenis) {
  const alasan = ambil("keterangan").value.trim();

  if (alasan === "") {
    tulisPesan("Isi keterangan dulu ya.");
    return;
  }

  try {
    await setDoc(doc(db, "attendance", uid + "_" + tanggalHariIni()), {
      uid: uid,
      tanggal: tanggalHariIni(),
      checkIn: null,
      checkOut: null,
      status: jenis,
      keterangan: alasan
    });

    tulisPesan("Pengajuan " + jenis + " berhasil dikirim.");
    ambil("keterangan").value = "";
  } catch (e) {
    console.error(e);
    tulisPesan("Gagal mengajukan: " + e.message);
  }

  await muatData();
}


// ---------- 8. PASANG PENDENGAR TOMBOL ----------

ambil("btnCheckIn").addEventListener("click", checkIn);
ambil("btnCheckOut").addEventListener("click", checkOut);

ambil("btnIzin").addEventListener("click", function () {
  ajukan("izin");
});

ambil("btnSakit").addEventListener("click", function () {
  ajukan("sakit");
});

ambil("btnKeluar").addEventListener("click", keluar);


// ---------- 9. PENJAGA HALAMAN ----------
// Yang bukan siswa atau belum login akan dikirim kembali ke index.html.

jagaHalaman(["siswa"], function (profil) {
  uid = profil.uid;
  ambil("boxAbsen").hidden = false;
  ambil("sapaan").textContent = "Halo, " + (profil.nama || "siswa");
  muatData();
});
