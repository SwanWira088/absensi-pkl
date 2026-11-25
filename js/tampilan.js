// tampilan.js
// Hanya dua pekerjaan kecil di halaman login:
// 1. Menampilkan jam dan tanggal yang berjalan.
// 2. Menyembunyikan/menampilkan password saat tombol "Lihat" ditekan.

function perbaruiJam() {
  const sekarang = new Date();
  const elemenJam = document.getElementById("jam");
  const elemenTanggal = document.getElementById("tanggal");

  if (elemenJam) {
    elemenJam.textContent = sekarang
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      })
      .replace(".", ":");
  }

  if (elemenTanggal) {
    elemenTanggal.textContent = sekarang.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
}

// Panggil sekali saat halaman dibuka, lalu ulangi tiap detik.
perbaruiJam();
setInterval(perbaruiJam, 1000);


const sandi = document.getElementById("password");
const tombolLihat = document.getElementById("lihat");

if (sandi && tombolLihat) {
  tombolLihat.addEventListener("click", function () {
    const sedangTersembunyi = sandi.type === "password";

    // Ubah tipe input: password <-> text.
    sandi.type = sedangTersembunyi ? "text" : "password";
    tombolLihat.textContent = sedangTersembunyi ? "Sembunyi" : "Lihat";
    tombolLihat.setAttribute(
      "aria-label",
      sedangTersembunyi ? "Sembunyikan password" : "Tampilkan password"
    );
  });
}
