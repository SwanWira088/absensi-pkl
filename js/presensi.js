// =====================================================
// presensi.js - Modul Presensi Harian
// Isi: login sementara, check-in, check-out, riwayat
// =====================================================

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);   // singkatan untuk mengambil elemen

let uid = null;        // id siswa yang sedang login
let dataSaya = [];     // seluruh data absen siswa ini


// ---------- 1. FUNGSI BANTU ----------
function pad(n) {                       // 5 -> "05"
  return String(n).padStart(2, "0");
}

function hariIni() {                    // contoh: "2026-11-18"
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function jamSekarang() {                // contoh: "09:55"
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatJam(waktu) {             // waktu Firestore -> "09:55"
  if (!waktu) return "-";
  const d = waktu.toDate();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tulisPesan(teks) {
  $("pesan").textContent = teks;
}

function setStatus(label, detail, kelas) {   // mengatur label status di layar
  $("status").textContent = label;
  $("status").className = "badge " + kelas;
  $("detailStatus").textContent = detail;
}


// ---------- 2. TANGGAL DAN JAM DI LAYAR ----------
function updateJam() {
  const d = new Date();
  $("tanggal").textContent = d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("jam").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(updateJam, 1000);
updateJam();


// ---------- 3. MENAMPILKAN DATA KE LAYAR ----------
function tampilkan() {
  const hari = dataSaya.find((d) => d.tanggal === hariIni());

  if (!hari) {                                   // belum check-in
    setStatus("Belum check-in", "Tekan tombol di bawah saat kamu tiba di tempat PKL.", "belum");
    $("btnCheckIn").disabled = false;
    $("btnCheckOut").disabled = true;
  } else if (!hari.checkOut) {                   // sudah check-in, belum pulang
    setStatus(hari.status, `Check-in pukul ${formatJam(hari.checkIn)}`, hari.status);
    $("btnCheckIn").disabled = true;
    $("btnCheckOut").disabled = false;
  } else {                                       // sudah check-out
    setStatus("Selesai",
      `Masuk ${formatJam(hari.checkIn)}, pulang ${formatJam(hari.checkOut)}`, "selesai");
    $("btnCheckIn").disabled = true;
    $("btnCheckOut").disabled = true;
  }

  // Riwayat 5 hari terakhir
  const daftar = $("riwayat");
  daftar.innerHTML = "";
  const terbaru = [...dataSaya]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 5);

  if (terbaru.length === 0) {
    const li = document.createElement("li");
    li.className = "kosong";
    li.textContent = "Belum ada riwayat";
    daftar.appendChild(li);
  }

  terbaru.forEach((d) => {
    const li = document.createElement("li");
    const kiri = document.createElement("span");
    kiri.textContent = `${d.tanggal} · ${formatJam(d.checkIn)}`;
    const tag = document.createElement("span");
    tag.className = "tag " + d.status;
    tag.textContent = d.status;
    li.append(kiri, tag);
    daftar.appendChild(li);
  });
}


// ---------- 4. MENGAMBIL DATA DARI FIRESTORE ----------
async function muatData() {
  try {
    const hasil = await getDocs(
      query(collection(db, "attendance"), where("uid", "==", uid))
    );
    dataSaya = hasil.docs.map((d) => d.data());
    tampilkan();
  } catch (e) {
    console.error(e);
    setStatus("Gagal memuat", e.message, "belum");
    tulisPesan("Gagal memuat data: " + e.message);
  }
}


// ---------- 5. CHECK-IN ----------
$("btnCheckIn").addEventListener("click", async () => {
  $("btnCheckIn").disabled = true;
  try {
    const pengaturan = (await getDoc(doc(db, "settings", "config"))).data();
    const status = jamSekarang() > pengaturan.batasTerlambat ? "terlambat" : "hadir";

    await setDoc(doc(db, "attendance", `${uid}_${hariIni()}`), {
      uid: uid,
      tanggal: hariIni(),
      checkIn: serverTimestamp(),     // waktu dari server, bukan jam HP
      checkOut: null,
      status: status,
      keterangan: ""
    });
    tulisPesan("Check-in berhasil.");
  } catch (e) {
    console.error(e);
    tulisPesan(e.code === "permission-denied"
      ? "Check-in ditolak. Kamu mungkin sudah absen hari ini."
      : "Gagal check-in: " + e.message);
  }
  await muatData();
});


// ---------- 6. CHECK-OUT ----------
$("btnCheckOut").addEventListener("click", async () => {
  $("btnCheckOut").disabled = true;
  try {
    await updateDoc(doc(db, "attendance", `${uid}_${hariIni()}`), {
      checkOut: serverTimestamp()
    });
    tulisPesan("Check-out berhasil. Sampai besok!");
  } catch (e) {
    console.error(e);
    tulisPesan("Gagal check-out: " + e.message);
  }
  await muatData();
});


// ---------- 7. LOGIN SEMENTARA ----------
$("btnLihat").addEventListener("click", () => {          // tombol Lihat/Sembunyi password
  const kolom = $("password");
  const tampil = kolom.type === "password";
  kolom.type = tampil ? "text" : "password";
  $("btnLihat").textContent = tampil ? "Sembunyi" : "Lihat";
});

$("password").addEventListener("keydown", (e) => {       // tombol Enter = Masuk
  if (e.key === "Enter") $("btnMasuk").click();
});

$("btnMasuk").addEventListener("click", async () => {
  const tombol = $("btnMasuk");
  tombol.disabled = true;
  tombol.textContent = "Memeriksa...";
  try {
    await signInWithEmailAndPassword(auth, $("email").value, $("password").value);
    $("pesanLogin").textContent = "";
  } catch (e) {
    $("pesanLogin").textContent = "Email atau password salah.";
    const kartu = document.querySelector(".login");      // kartu bergoyang
    kartu.classList.remove("goyang");
    void kartu.offsetWidth;
    kartu.classList.add("goyang");
  }
  tombol.disabled = false;
  tombol.textContent = "Masuk";
});

$("btnKeluar").addEventListener("click", () => signOut(auth));


// ---------- 8. MEMANTAU STATUS LOGIN ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {                                // belum login: tampilkan form login
    uid = null;
    $("boxLogin").hidden = false;
    $("boxAbsen").hidden = true;
    return;
  }

  uid = user.uid;                             // sudah login: tampilkan halaman absen
  $("boxLogin").hidden = true;
  $("boxAbsen").hidden = false;

  try {
    const siswa = await getDoc(doc(db, "users", uid));
    $("sapaan").textContent = "Halo, " + (siswa.exists() ? siswa.data().nama : user.email);
  } catch (e) {
    $("sapaan").textContent = "Halo, " + user.email;
  }
  await muatData();
});