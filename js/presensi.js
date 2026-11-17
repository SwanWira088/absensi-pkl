import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
let uid = null;
let dataSaya = [];

// ---------- Fungsi bantu ----------
function pad(n) { return String(n).padStart(2, "0"); }

function hariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function jamSekarang() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatJam(ts) {
  if (!ts) return "-";
  return ts.toDate()
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(".", ":");
}

function pesan(teks) { $("pesan").textContent = teks; }

// ---------- Jam dan tanggal di layar ----------
function updateJam() {
  const d = new Date();
  $("tanggal").textContent = d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("jam").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(updateJam, 1000);
updateJam();

// ---------- Ambil dan tampilkan data ----------
async function muatData() {
  const snap = await getDocs(
    query(collection(db, "attendance"), where("uid", "==", uid))
  );
  dataSaya = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  tampilkan();
}

function tampilkan() {
  const hari = dataSaya.find((d) => d.tanggal === hariIni());

  if (!hari) {
    setStatus("Belum check-in", "Tekan tombol di bawah saat kamu tiba di tempat PKL.", "belum");
    $("btnCheckIn").disabled = false;
    $("btnCheckOut").disabled = true;
  } else if (!hari.checkOut) {
    setStatus(hari.status, `Check-in pukul ${formatJam(hari.checkIn)}`, hari.status);
    $("btnCheckIn").disabled = true;
    $("btnCheckOut").disabled = false;
  } else {
    setStatus("Selesai",
      `Masuk ${formatJam(hari.checkIn)}, pulang ${formatJam(hari.checkOut)}`, "selesai");
    $("btnCheckIn").disabled = true;
    $("btnCheckOut").disabled = true;
  }

  const daftar = $("riwayat");
  daftar.innerHTML = "";
  [...dataSaya]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 5)
    .forEach((d) => {
      const li = document.createElement("li");
      li.textContent = `${d.tanggal} · ${formatJam(d.checkIn)} · ${d.status}`;
      daftar.appendChild(li);
    });
}

// ---------- Check-in ----------
$("btnCheckIn").addEventListener("click", async () => {
  $("btnCheckIn").disabled = true;
  try {
    const cfg = (await getDoc(doc(db, "settings", "config"))).data();
    // Sementara memakai jam perangkat untuk menentukan status.
    // Cara yang lebih aman dibahas bersama Wira (lewat Security Rules).
    const status = jamSekarang() > cfg.batasTerlambat ? "terlambat" : "hadir";

    await setDoc(doc(db, "attendance", `${uid}_${hariIni()}`), {
      uid: uid,
      tanggal: hariIni(),
      checkIn: serverTimestamp(),   // waktu dari server
      checkOut: null,
      status: status,
      keterangan: ""
    });
    pesan("Check-in berhasil.");
  } catch (e) {
    console.error(e);
    pesan(e.code === "permission-denied"
      ? "Check-in ditolak. Kamu mungkin sudah absen hari ini."
      : "Gagal check-in: " + e.message);
  }
  await muatData();
});

// ---------- Check-out ----------
$("btnCheckOut").addEventListener("click", async () => {
  $("btnCheckOut").disabled = true;
  try {
    await updateDoc(doc(db, "attendance", `${uid}_${hariIni()}`), {
      checkOut: serverTimestamp()
    });
    pesan("Check-out berhasil. Sampai besok!");
  } catch (e) {
    console.error(e);
    pesan("Gagal check-out: " + e.message);
  }
  await muatData();
});

// ---------- Login sementara ----------
$("btnMasuk").addEventListener("click", async () => {
  const tombol = $("btnMasuk");
  tombol.disabled = true;
  tombol.textContent = "Memeriksa...";
  try {
    await signInWithEmailAndPassword(auth, $("email").value, $("password").value);
    $("pesanLogin").textContent = "";
  } catch (e) {
    $("pesanLogin").textContent = "Email atau password salah.";
    const kartu = document.querySelector(".login");
    kartu.classList.remove("goyang");
    void kartu.offsetWidth;
    kartu.classList.add("goyang");
  }
});

$("btnKeluar").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    uid = null;
    $("boxLogin").hidden = false;
    $("boxAbsen").hidden = true;
    return;
  }
  uid = user.uid;
  $("boxLogin").hidden = true;
  $("boxAbsen").hidden = false;

  try {
    const u = await getDoc(doc(db, "users", uid));
    $("sapaan").textContent = "Halo, " + (u.exists() ? u.data().nama : user.email);
  } catch (e) {
    $("sapaan").textContent = "Halo, " + user.email;
  }
  await muatData();
});