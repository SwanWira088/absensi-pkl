// Modul Ibra: jurnal siswa, persetujuan, rekap, dan PDF.
// Memakai Firebase dan autentikasi yang sudah ada di project tim.
import { db } from "./firebase-config.js";
import { jagaHalaman, keluar } from "./auth.js";
import {
  collection, addDoc, doc, getDoc, getDocs, query, where,
  onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const ambil = id => document.getElementById(id);
const halaman = document.body.dataset.halaman;
const statusHadir = ["hadir", "terlambat", "izin", "sakit", "alfa"];
const koleksiJurnal = collection(db, "journals");
let profilSaya;
let berhenti;

function pesan(teks) { ambil("pesan").textContent = teks; }
function gagal(error) { console.error(error); pesan("Gagal: " + (error.message || error)); }
function tanggalHariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dataSnapshot(snapshot) {
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
}
function terbaru(a, b) { return String(b.tanggal || "").localeCompare(String(a.tanggal || "")); }
function elemen(tag, teks, kelas) {
  const e = document.createElement(tag);
  e.textContent = teks;
  if (kelas) e.className = kelas;
  return e;
}
function tombol(teks, kelas, aksi) {
  const b = elemen("button", teks, kelas);
  b.type = "button";
  b.addEventListener("click", aksi);
  return b;
}
// Gunakan textContent, bukan innerHTML, supaya isian siswa tidak dijalankan sebagai HTML.
function kartuJurnal(j, nama = "") {
  const kartu = elemen("article", "", "item-jurnal");
  kartu.append(elemen("p", (nama ? nama + " · " : "") + j.tanggal, "sub"));
  const status = j.statusPersetujuan || "tidak diketahui";
  kartu.append(elemen("span", status, "tag " + status.replaceAll(" ", "-")));
  kartu.append(elemen("h3", j.judul), elemen("p", j.uraian));
  if (j.catatanPembimbing) kartu.append(elemen("p", "Catatan pembimbing: " + j.catatanPembimbing, "catatan-jurnal"));
  return kartu;
}
function pantau(q, tampilkan) {
  if (berhenti) berhenti();
  berhenti = onSnapshot(q, s => tampilkan(dataSnapshot(s).sort(terbaru)), e => {
    ambil("daftarJurnal").textContent = "Jurnal gagal dimuat.";
    gagal(e);
  });
}
window.addEventListener("pagehide", () => { if (berhenti) berhenti(); });

// 1. JURNAL SISWA: simpan, baca, dan ubah.
function mulaiJurnal() {
  let idEdit = null;
  let sibuk = false;
  const form = ambil("formJurnal");
  function resetForm() {
    idEdit = null;
    form.reset();
    ambil("tanggal").value = tanggalHariIni();
    ambil("btnSimpan").textContent = "Simpan jurnal";
    ambil("btnBatal").hidden = true;
  }
  resetForm();
  ambil("btnBatal").addEventListener("click", () => { if (!sibuk) resetForm(); });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (sibuk) return;
    const tanggal = ambil("tanggal").value;
    const judul = ambil("judul").value.trim();
    const uraian = ambil("uraian").value.trim();
    if (!tanggal || !judul || !uraian) { pesan("Isi tanggal, judul, dan uraian terlebih dahulu."); return; }
    if (tanggal > tanggalHariIni()) { pesan("Tanggal kegiatan tidak boleh melebihi hari ini."); return; }
    sibuk = true;
    ambil("btnSimpan").disabled = true;
    ambil("btnBatal").disabled = true;
    try {
      if (!idEdit) {
        // addDoc membuat dokumen baru dengan ID otomatis.
        await addDoc(koleksiJurnal, {
          uid: profilSaya.uid, tanggal, judul, uraian,
          statusPersetujuan: "menunggu", catatanPembimbing: ""
        });
        pesan("Jurnal berhasil disimpan. Menunggu pemeriksaan.");
      } else {
        // Transaksi membaca status terbaru sebelum mengubah jurnal.
        const ref = doc(db, "journals", idEdit);
        await runTransaction(db, async tx => {
          const s = await tx.get(ref);
          if (!s.exists()) throw new Error("Jurnal tidak ditemukan.");
          const lama = s.data();
          if (lama.uid !== profilSaya.uid || !["menunggu", "perlu perbaikan"].includes(lama.statusPersetujuan)) {
            throw new Error("Jurnal ini tidak boleh diubah lagi.");
          }
          tx.update(ref, { tanggal, judul, uraian, statusPersetujuan: "menunggu" });
        });
        pesan("Jurnal diperbarui dan menunggu pemeriksaan ulang.");
      }
      resetForm();
    } catch(e) { gagal(e); }
    finally { sibuk = false; ambil("btnSimpan").disabled = false; ambil("btnBatal").disabled = false; }
  });
  // Hanya baca jurnal siswa yang sedang login. Perubahan langsung tampil.
  pantau(query(koleksiJurnal, where("uid", "==", profilSaya.uid)), daftar => {
    const wadah = ambil("daftarJurnal");
    wadah.replaceChildren();
    if (!daftar.length) wadah.textContent = "Belum ada jurnal.";
    daftar.forEach(j => {
      const kartu = kartuJurnal(j);
      if (["menunggu", "perlu perbaikan"].includes(j.statusPersetujuan)) {
        kartu.append(tombol("Ubah jurnal", "tombol garis", () => {
          if (sibuk) return;
          idEdit = j.id;
          ambil("tanggal").value = j.tanggal;
          ambil("judul").value = j.judul;
          ambil("uraian").value = j.uraian;
          ambil("btnSimpan").textContent = "Simpan perubahan";
          ambil("btnBatal").hidden = false;
          pesan("Sedang mengubah jurnal.");
          form.scrollIntoView({behavior:"smooth", block:"start"});
          ambil("judul").focus();
        }));
      } else if (j.statusPersetujuan === "disetujui") {
        kartu.append(elemen("p", "Jurnal sudah disetujui dan tidak dapat diubah.", "sub"));
      }
      wadah.append(kartu);
    });
  });
}

// 2. PEMBIMBING / ADMIN: periksa jurnal yang menunggu.
function mulaiPersetujuan() {
  const namaCache = new Map();
  async function namaSiswa(uid) {
    if (!namaCache.has(uid)) {
      namaCache.set(uid, getDoc(doc(db, "users", uid)).then(s => s.exists() ? (s.data().nama || uid) : uid).catch(() => uid));
    }
    return namaCache.get(uid);
  }
  pantau(query(koleksiJurnal, where("statusPersetujuan", "==", "menunggu")), daftar => {
    const wadah = ambil("daftarJurnal");
    wadah.replaceChildren();
    ambil("jumlahMenunggu").textContent = daftar.length;
    if (!daftar.length) wadah.textContent = "Tidak ada jurnal yang menunggu.";
    daftar.forEach(j => {
      const kartu = kartuJurnal(j);
      const nama = elemen("p", "Siswa: memuat...", "sub");
      kartu.prepend(nama);
      namaSiswa(j.uid).then(n => { nama.textContent = "Siswa: " + n; });
      const catatan = document.createElement("textarea");
      catatan.id = "catatan-" + j.id;
      catatan.rows = 3;
      catatan.maxLength = 2000;
      const label = elemen("label", "Catatan pembimbing (wajib jika perlu perbaikan)");
      label.htmlFor = catatan.id;
      kartu.append(label, catatan);
      let sibuk = false;
      async function putuskan(status) {
        if (sibuk) return;
        const isi = catatan.value.trim();
        if (status === "perlu perbaikan" && !isi) { pesan("Isi catatan sebelum meminta perbaikan."); catatan.focus(); return; }
        sibuk = true; setuju.disabled = revisi.disabled = true;
        try {
          await runTransaction(db, async tx => {
            const ref = doc(db, "journals", j.id);
            const s = await tx.get(ref);
            if (!s.exists() || s.data().statusPersetujuan !== "menunggu") throw new Error("Jurnal sudah diperiksa atau tidak ditemukan.");
            // Pembimbing hanya mengubah status dan catatan.
            tx.update(ref, {statusPersetujuan: status, catatanPembimbing: isi});
          });
          pesan("Jurnal berhasil ditandai " + status + ".");
        } catch(e) { gagal(e); }
        finally { sibuk = false; setuju.disabled = revisi.disabled = false; }
      }
      const setuju = tombol("Setujui", "tombol utama", () => putuskan("disetujui"));
      const revisi = tombol("Perlu perbaikan", "tombol garis", () => putuskan("perlu perbaikan"));
      kartu.append(setuju, revisi);
      wadah.append(kartu);
    });
  });
}

// 3. REKAP BULANAN: hanya membaca attendance dan journals.
function batasBulan(bulan) {
  const [y,m] = bulan.split("-").map(Number);
  const berikut = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,"0")}`;
  return [bulan + "-01", berikut + "-01"];
}
function queryBulanan(nama, uid, bulan) {
  const [awal, akhir] = batasBulan(bulan);
  return query(collection(db,nama), where("uid","==",uid), where("tanggal",">=",awal), where("tanggal","<",akhir));
}
async function mulaiRekap() {
  let hasilPDF = null;
  let urutan = 0;
  const staf = profilSaya.role !== "siswa";
  ambil("bulan").value = tanggalHariIni().slice(0,7);
  ambil("linkKembali").href = staf ? "dashboard.html" : "absen.html";
  ambil("linkJurnal").href = staf ? "persetujuan-jurnal.html" : "jurnal.html";
  if (staf) {
    ambil("pilihSiswa").hidden = false;
    const s = await getDocs(query(collection(db,"users"),where("role","==","siswa")));
    const siswa = dataSnapshot(s).sort((a,b) => String(a.nama || "").localeCompare(String(b.nama || "")));
    siswa.forEach(p => { const o = elemen("option",p.nama || p.id); o.value = p.id; ambil("siswa").append(o); });
  }
  function kosongkan() {
    urutan++;
    hasilPDF = null; ambil("btnPDF").disabled = true;
    ambil("angkaRekap").hidden = true; ambil("daftarJurnal").replaceChildren();
  }
  async function muat() {
    kosongkan();
    const nomor = urutan;
    const bulan = ambil("bulan").value;
    const uid = staf ? ambil("siswa").value : profilSaya.uid;
    const nama = staf ? ambil("siswa").selectedOptions[0]?.textContent : profilSaya.nama;
    if (!uid || !/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan)) { pesan("Pilih siswa dan bulan yang valid."); return; }
    pesan("Memuat rekap...");
    try {
      const [a,j] = await Promise.all([getDocs(queryBulanan("attendance",uid,bulan)),getDocs(queryBulanan("journals",uid,bulan))]);
      if (nomor !== urutan) return;
      const rekap = Object.fromEntries(statusHadir.map(s => [s,0]));
      dataSnapshot(a).forEach(d => { if (Object.hasOwn(rekap,d.status)) rekap[d.status]++; });
      const daftar = dataSnapshot(j).sort(terbaru);
      const angka = ambil("angkaRekap");
      angka.replaceChildren();
      statusHadir.forEach(s => { const k = elemen("div", ""); k.append(elemen("span",s),elemen("strong",String(rekap[s]))); angka.append(k); });
      angka.hidden = false;
      const wadah = ambil("daftarJurnal");
      if (!daftar.length) wadah.textContent = "Belum ada jurnal pada bulan ini.";
      daftar.forEach(j => wadah.append(kartuJurnal(j)));
      hasilPDF = {nama:nama || uid, bulan, rekap, daftar};
      ambil("btnPDF").disabled = false;
      pesan("Rekap berhasil dimuat.");
    } catch(e) { if (nomor === urutan) gagal(e); }
  }
  [ambil("bulan"),ambil("siswa")].forEach(e => e.addEventListener("change", () => { kosongkan(); pesan("Tekan Tampilkan rekap untuk memuat pilihan baru."); }));
  ambil("btnMuat").addEventListener("click",muat);
  ambil("btnPDF").addEventListener("click", () => { if (hasilPDF) { try { buatPDF(hasilPDF); } catch(e) { gagal(e); } } });
  await muat();
}

// 4. PDF: cetak ringkasan dan seluruh jurnal, dengan halaman tambahan otomatis.
function buatPDF({nama,bulan,rekap,daftar}) {
  if (!window.jspdf?.jsPDF) throw new Error("Library jsPDF belum berhasil dimuat.");
  const pdf = new window.jspdf.jsPDF({unit:"mm",format:"a4"});
  let y = 18;
  const kiri = 16;
  function teks(isi, ukuran = 11, tebal = false) {
    pdf.setFont("helvetica",tebal ? "bold" : "normal");
    pdf.setFontSize(ukuran);
    const baris = pdf.splitTextToSize(String(isi),178);
    for (const b of baris) {
      if (y > 275) { pdf.addPage(); y = 18; }
      pdf.text(b,kiri,y); y += ukuran * 0.46 + 1;
    }
  }
  teks("REKAP KEHADIRAN DAN JURNAL PKL",15,true);
  teks("Nama siswa: " + nama); teks("Periode: " + bulan); y += 3;
  teks("A. Rekap kehadiran",13,true);
  statusHadir.forEach(s => teks(s[0].toUpperCase()+s.slice(1)+": "+rekap[s]+" hari"));
  y += 4; teks("B. Jurnal kegiatan",13,true);
  if (!daftar.length) teks("Tidak ada jurnal pada periode ini.");
  daftar.forEach((j,i) => {
    if (y > 250) { pdf.addPage(); y=18; }
    teks(`${i+1}. ${j.tanggal} - ${j.judul}`,11,true);
    teks(j.uraian); teks("Status: " + j.statusPersetujuan);
    if (j.catatanPembimbing) teks("Catatan: " + j.catatanPembimbing);
    y += 4;
  });
  const total = pdf.getNumberOfPages();
  for (let i=1;i<=total;i++) { pdf.setPage(i); pdf.setFontSize(9); pdf.setFont("helvetica","normal"); pdf.text(`Sistem Absensi PKL | Halaman ${i}/${total}`,kiri,287); }
  pdf.save("rekap-pkl-"+bulan+".pdf");
}

// Penjaga halaman dari Wira. Isi baru muncul setelah akun dan peran diperiksa.
const peran = {jurnal:["siswa"], persetujuan:["pembimbing","admin"], rekap:["siswa","pembimbing","admin"]};
ambil("btnKeluar").addEventListener("click", () => keluar().catch(gagal));
jagaHalaman(peran[halaman], async profil => {
  profilSaya = profil;
  ambil("memuat").hidden = true;
  ambil("isiHalaman").hidden = false;
  ambil("sapaan").textContent = "Halo, " + (profil.nama || profil.role);
  try {
    if (halaman === "jurnal") mulaiJurnal();
    if (halaman === "persetujuan") mulaiPersetujuan();
    if (halaman === "rekap") await mulaiRekap();
  } catch(e) { gagal(e); }
});
