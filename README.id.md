<div align="center">

<img src="images/camel-logo.png" alt="Albion Radar - Camel Radar logo" width="120" />

# Albion Radar — Camel Radar untuk Albion Online

### Radar dan overlay peta **Albion Online** yang gratis dan open-source. Lihat pemain di sekitar, resource gathering, musuh, chest, dungeon, dan mist secara real-time.

Bahasa: **Indonesia** | [English](README.md)

</div>

**Camel Radar** adalah **Albion Radar** gratis dan open-source untuk **Albion Online** — sebuah overlay radar dan tools peta lokal yang membaca lalu lintas jaringanmu sendiri untuk menampilkan pemain di sekitar, resource gathering, mob, musuh, chest, dungeon, titik fishing, dan mist objective dalam UI berbasis browser yang rapi. Aplikasi ini berjalan sepenuhnya di PC-mu dengan packet capture pasif (tanpa injeksi, tanpa membaca memori, tanpa server pihak ketiga), dan juga bisa berjalan dalam mode demo no-capture untuk pengujian UI.

Kalau kamu sedang mencari **radar Albion Online**, **radar gathering Albion**, atau **radar pemain Albion** yang open source, aktif dikembangkan, dan mudah dipasang bahkan untuk pemain non-teknis, proyek ini dibuat untukmu.

> ⭐ **Kalau Albion radar ini bermanfaat, tolong [beri bintang pada repository](https://github.com/fizakbrr/Albion-Radar) — ini membantu pemain Albion Online lain menemukannya.**

## Screenshot

| Pengaturan & filter radar | Kanvas radar live |
| --- | --- |
| ![UI pengaturan radar Albion Online dengan filter pemain, resource, dan musuh](images/screenshot-home.png) | ![Overlay kanvas radar Albion live dengan penanda pemain lokal dan grid](images/screenshot-radar.png) |

## Mulai Cepat (Tanpa Perlu Bisa Coding)

Bagian ini untuk pemain yang hanya ingin menjalankan Camel Radar saat bermain — tidak perlu paham pemrograman sama sekali. Ikuti langkah-langkah di bawah ini secara berurutan. Masing-masing hanya perlu dilakukan sekali, kecuali disebutkan lain.

### Yang kamu butuhkan

- PC dengan Windows 10 atau 11 (PC yang sama dengan yang kamu pakai untuk main Albion Online).
- Koneksi internet.
- Sekitar 10 menit untuk setup pertama kali.

### Langkah 1 — Install Node.js

Node.js adalah program gratis yang membuat Camel Radar bisa berjalan di komputermu.

1. Buka [nodejs.org](https://nodejs.org) dan unduh versi **LTS** (tombol bertuliskan
   "Recommended for Most Users").
2. Buka file yang sudah diunduh, lalu klik **Next** terus sampai selesai memakai pengaturan bawaan.
3. Restart komputer setelah instalasi selesai.

### Langkah 2 — Unduh Camel Radar

1. Buka [halaman GitHub Camel Radar](https://github.com/fizakbrr/CamelRadar).
2. Klik tombol hijau **Code**, lalu klik **Download ZIP**.
3. Cari file ZIP yang sudah diunduh (biasanya di folder `Downloads`), klik kanan file tersebut, lalu
   pilih **Extract All...**. Pilih folder yang mudah kamu ingat, misalnya di Desktop.

### Langkah 3 — Install Npcap (hanya diperlukan agar radar bisa lihat pemain/resource secara live)

Camel Radar membaca lalu lintas jaringan Albion Online untuk menampilkan sesuatu di radar. Npcap
adalah tools gratis yang memungkinkan hal itu.

1. Buka [npcap.com/#download](https://npcap.com/#download) dan unduh installer Npcap.
2. Jalankan installer-nya. Saat sampai di layar pilihan, pastikan opsi **"Install Npcap in WinPcap
   API-compatible Mode"** dicentang, lalu selesaikan instalasi.

Jika langkah ini dilewati, Camel Radar tetap akan terbuka di browser, tapi tampilan radarnya akan
kosong karena tidak bisa membaca data game.

### Langkah 4 — Install komponen Camel Radar

1. Buka folder tempat kamu meng-extract Camel Radar.
2. Buka folder `bin` di dalamnya.
3. Double-click **`install.bat`**.
4. Sebuah jendela hitam akan terbuka dan menampilkan teks yang bergulir — ini normal, artinya sedang
   mengunduh semua yang dibutuhkan Camel Radar. Tunggu sampai muncul tulisan "Press any key to
   continue", lalu tekan sembarang tombol untuk menutupnya.

Langkah ini hanya perlu dilakukan sekali (atau diulang lagi kalau kamu mengunduh versi Camel Radar
yang lebih baru).

### Langkah 5 — Jalankan Camel Radar

1. Kembali ke folder `bin`.
2. Klik kanan **`start.bat`** lalu pilih **Run as administrator** (akses Administrator diperlukan
   supaya Camel Radar diizinkan membaca lalu lintas jaringan game).
3. Saat pertama kali dijalankan, jendela hitam akan menampilkan daftar koneksi jaringanmu dengan
   nomor di depannya, seperti ini:
   ```text
   1. Wi-Fi          ip address: 192.168.1.25
   2. Ethernet        ip address: 192.168.1.30
   ```
   Ketik nomor koneksi yang kamu pakai untuk main Albion Online (biasanya satu-satunya yang
   terhubung ke internet), lalu tekan Enter. Camel Radar akan mengingat pilihanmu, jadi kamu tidak
   akan ditanya lagi setelah ini.
4. Browser-mu akan otomatis terbuka ke halaman Camel Radar. Biarkan jendela hitam tetap terbuka di
   belakang layar — menutupnya akan menghentikan Camel Radar.
5. Buka Albion Online dan login. Radar akan mulai menampilkan data peta seiring kamu bermain.

### Setiap kali ingin main lagi

Kamu tidak perlu mengulang Langkah 1–4. Cukup ulangi **Langkah 5**: klik kanan `start.bat` di dalam
folder `bin` lalu pilih **Run as administrator**.

### Menghentikan Camel Radar

Tutup tab browser, lalu tutup jendela hitamnya (atau klik di dalam jendela tersebut dan tekan
`Ctrl+C`).

### Kalau ada yang tidak berjalan dengan benar

- **Windows menampilkan layar biru "Windows protected your PC"** saat menginstall Node.js atau
  Npcap — ini normal untuk installer independen berukuran kecil. Klik **More info**, lalu **Run
  anyway**.
- **Halaman radar terbuka tapi kosong** — mungkin Albion Online belum dijalankan, atau koneksi
  jaringan yang salah dipilih di Langkah 5. Buka folder induk dari folder `bin`, hapus file bernama
  `ip.txt` jika ada, lalu jalankan `start.bat` lagi untuk memilih koneksi sekali lagi.
- **Muncul pop-up firewall saat pertama kali dijalankan** — klik **Allow access** supaya Camel Radar
  bisa berkomunikasi dengan dirinya sendiri melalui jaringan lokalmu.
- **Ingin mencoba tampilannya tanpa data game secara live** — buka folder Camel Radar (bukan folder
  `bin`), lalu buka jendela PowerShell di situ (Shift + klik kanan di dalam folder, lalu pilih "Open
  PowerShell window here"), kemudian jalankan:
  ```powershell
  npm run start:no-capture
  ```

Jika kamu terbiasa memakai terminal atau ingin kontrol lebih (port khusus, environment variable,
menjalankan test, dll.), lihat bagian [Installation](#installation) dan [Usage](#usage) di bawah,
yang membahas setup yang sama menggunakan perintah command-line, bukan script bantuan.

## Fitur Utama

- Antarmuka radar lokal untuk Albion Online dengan UI utilitas desktop berbasis browser.
- Tampilan peta Albion untuk latar peta, grid, penanda pemain lokal, dan lapisan overlay.
- Handler untuk resource, living resource, mob, chest, dungeon, fishing, dan mist objective.
- Daftar pemain dan tampilan equipment jika data yang kompatibel tersedia.
- Server HTTP Express dengan streaming WebSocket untuk update lokal secara real-time.
- Komponen UI React, Vite, Tailwind CSS, dan bergaya shadcn.
- Pipeline build TypeScript untuk frontend, script runtime lama, server, dan test.
- Dukungan packet capture opsional melalui Npcap dan package native `cap`.
- Mode no-capture untuk pengembangan, demo, dan pengujian UI tanpa lalu lintas Albion Online secara live.

## Tech Stack

- TypeScript
- React
- Vite
- Tailwind CSS
- Komponen UI shadcn
- Express
- WebSocket
- Node.js
- Npcap dan `cap` untuk packet capture lokal opsional
- Node test runner

## Persyaratan

- Windows 10/11
- Node.js `20.20.2` atau lebih baru
- npm `10.8.0` atau lebih baru

Khusus untuk packet capture secara live:

- Npcap terinstall
- Visual Studio C++ build tools
- Terminal Administrator
- Lalu lintas Albion Online di UDP port `5056`

React UI, static routes, test WebSocket, dan test fixture parser bisa dijalankan tanpa packet capture.

## Instalasi

```powershell
git clone https://github.com/fizakbrr/CamelRadar.git
cd CamelRadar
npm ci
```

Package native `cap` bersifat opsional. Jika package tersebut gagal di-build di komputermu, Camel
Radar tetap bisa berjalan sebagai utilitas Albion Online dalam mode no-capture.

## Penggunaan

Menjalankan UI overlay Albion Online tanpa packet capture:

```powershell
npm run start:no-capture
```

Buka:

```text
http://localhost:5001
```

Menjalankan dengan packet capture lokal secara live:

```powershell
npm start
```

Pada saat pertama kali menjalankan mode live-capture, pilih adapter jaringan yang dipakai Albion
Online. IP adapter yang dipilih akan disimpan di `ip.txt`, yang diabaikan oleh git.

Kamu juga bisa langsung menentukan adapter-nya:

```powershell
$env:CAMEL_RADAR_ADAPTER_IP = "192.168.1.25"
npm start
```

## Perintah Pengembangan

Build seluruh proyek:

```powershell
npm run build
```

Menjalankan backend Express yang sudah di-compile setelah build:

```powershell
npm run serve
```

Menjalankan server frontend Vite untuk iterasi frontend:

```powershell
npm run dev
```

Menjalankan test:

```powershell
npm test
```

Perintah test akan mem-build frontend React, meng-compile TypeScript runtime dan server, menjalankan
server dengan capture dinonaktifkan, memverifikasi rute UI/static/config utama, memeriksa bentuk
payload WebSocket, dan menjalankan test fixture parser.

Script bantuan Windows tersedia di `bin/`:

- `bin/install.bat`: menjalankan `npm ci`
- `bin/start.bat`: menjalankan `npm start`

## Konfigurasi

Environment variable:

- `PORT`: port HTTP UI, default `5001`
- `WS_PORT`: port WebSocket, default `5002`
- `WS_HOST`: host WebSocket, default `localhost`
- `CAMEL_RADAR_CAPTURE`: `1` untuk mencoba packet capture, `0` untuk menonaktifkannya
- `CAMEL_RADAR_ADAPTER_IP`: alamat IPv4 dari adapter capture
- `CAMEL_RADAR_OPEN_BROWSER`: `1` untuk membuka browser setelah start, `0` untuk melewatinya

Contoh:

```powershell
$env:PORT = "5101"
$env:WS_PORT = "5102"
$env:CAMEL_RADAR_CAPTURE = "0"
npm run serve
```

## Struktur Proyek

```text
.
|-- server/                   # Server Express, server WebSocket, pemilihan adapter, dan startup capture
|-- src/                      # Frontend React, Vite, Tailwind, dan UI shadcn
|-- scripts/
|   |-- Handlers/             # Handler entity, resource, peta, pemain, dan objective Albion Online
|   |-- Drawings/             # Helper canvas drawing untuk radar dan overlay peta
|   |-- Utils/                # Setting runtime, event codes, config WebSocket, dan entrypoint browser
|   |-- classes/              # Photon packet parser dan protocol deserializer
|   `-- enumerations/         # Pemetaan tipe protocol
|-- tools/                    # Utilitas copy asset saat build
|-- tests/                    # Cakupan Node test runner untuk server, WebSocket, parser, dan data resource
|-- bin/                      # Script bantuan Windows opsional
|-- images/                   # Aset gambar lokal yang dipakai UI dan runtime overlay
|-- sounds/                   # Aset audio yang dipakai untuk alert radar
|-- config/                   # Konfigurasi runtime lokal, diabaikan oleh git
|-- tsconfig*.json            # Konfigurasi proyek TypeScript
`-- package.json              # Script npm, dependency, dan metadata package
```

Hasil build yang dihasilkan ditulis ke `dist/`, `dist-runtime/`, `dist-server/`, dan `dist-config/`.

## Pemecahan Masalah

### UI berjalan tapi data live kosong

Pastikan:

- Albion Online sedang berjalan dan terhubung ke world.
- IP adapter di `ip.txt` sesuai dengan adapter jaringan yang membawa lalu lintas Albion Online.
- `CAMEL_RADAR_CAPTURE` tidak diset ke `0`.
- Tidak ada proses Node lama yang masih memakai port `5001` atau `5002`.
- Npcap dan package native `cap` terinstall dengan benar.

### Packet capture tidak tersedia

Gunakan mode no-capture sementara kamu memperbaiki dependency native:

```powershell
npm run start:no-capture
```

Lalu verifikasi modul capture native-nya:

```powershell
node -e "const { Cap } = require('cap'); console.log(Cap.deviceList())"
```

### Halaman radar terbuka tapi tidak menampilkan titik pemain

Lalu lintas Albion Online saat ini bisa saja tidak menyertakan atau melindungi koordinat posisi
pemain secara live. Camel Radar tetap bisa menampilkan data identitas, equipment, atau entity yang
didukung jika paketnya tersedia, tapi tidak bisa menggambar titik yang presisi tanpa data posisi
yang bisa dipakai.

### Error TypeScript masih muncul di editor

Jalankan `TypeScript: Restart TS Server` di VS Code. Repository ini memakai konfigurasi TypeScript
terpisah untuk aplikasi React, runtime browser lama, runtime server, dan folder scripts.

## Topik GitHub

Topik repository GitHub yang disarankan untuk ditambahkan secara manual:

- `albion-online`
- `albion-radar`
- `albion-online-radar`
- `albion-online-tools`
- `albion-online-utility`
- `albion-online-overlay`
- `albion-map-tool`
- `game-utility`
- `desktop-utility`
- `open-source-game-tool`
- `typescript`
- `react`
- `websocket`
- `express`

## Disclaimer

Proyek ini disediakan hanya untuk tujuan edukasi dan riset. Gunakan secara bertanggung jawab dan
hormati ketentuan layanan (terms of service) dari software, platform, atau game apa pun yang
berinteraksi dengannya. Maintainer tidak bertanggung jawab atas penyalahgunaan, penalti akun, atau
pelanggaran aturan pihak ketiga.

## Kredit

Camel Radar dikelola oleh fizakbrr.

Karya proyek awal oleh Zeldruck. Karya radar upstream tambahan oleh FashionFlora, karya parsing
paket lama dari `photon-packet-parser`, dan perilaku Protocol 18 diperiksa silang dengan photon
parser milik AutoDruid.

## Lisensi

Proyek ini dilisensikan di bawah ISC License. Lihat field `license` di `package.json`.
