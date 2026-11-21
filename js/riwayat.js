import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

function pad(n) { return String(n).padStart(2, "0"); }

function formatJam(waktu) {
  if (!waktu) return "-";
  const d = waktu.toDate();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "absen.html"; // belum login: kembali ke halaman absen
    return;
  }

  const hasil = await getDocs(
    query(collection(db, "attendance"), where("uid", "==", user.uid))
  );

  const data = hasil.docs.map((d) => d.data())
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal)); // terbaru di atas

  const daftar = document.getElementById("daftar");

  data.forEach((d) => {
    const li = document.createElement("li");

    const kiri = document.createElement("span");
    kiri.textContent = `${d.tanggal} — masuk ${formatJam(d.checkIn)} pulang ${formatJam(d.checkOut)}`;

    const tag = document.createElement("span");
    tag.className = "tag " + d.status;
    tag.textContent = d.status;

    li.append(kiri, tag);
    daftar.appendChild(li);
  });
});