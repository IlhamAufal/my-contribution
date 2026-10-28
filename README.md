# my-contribution

Ubah riwayat git Anda menjadi laporan kontribusi per kontributor yang siap dimasukkan ke portofolio atau CV.

Tanpa instalasi, tanpa dependensi. Cukup Node.js 18+ dan git.

## Mulai cepat

Jalankan di dalam repositori git mana pun:

```bash
npx my-contribution
```

Simpan ke dalam file:

```bash
npx my-contribution --out CONTRIBUTIONS.md
```

## Apa yang Anda dapatkan

- Tabel ringkasan: commit, persentase kontribusi, baris ditambah/dihapus, dan file yang diubah per kontributor
- Untuk setiap orang: periode aktif, area utama codebase, bahasa pemrograman, komposisi pekerjaan (feat/fix/refactor...), dan sorotan utama (highlights)
- File lock, output build, dan aset biner diabaikan agar angka mencerminkan pekerjaan nyata

## Opsi umum

Hanya rentang waktu tertentu:

```bash
npx my-contribution --since 2026-01-01 --until 2026-06-30
```

Hanya satu orang:

```bash
npx my-contribution --author budi
```

Gabungkan beberapa nama atau email milik orang yang sama (entri pertama sebagai nama tampilan):

```bash
npx my-contribution --merge "Budi,budi@mail.com,budi.s"
```

Output yang dapat dibaca mesin:

```bash
npx my-contribution --json
```

Jalankan `npx my-contribution --help` untuk melihat semua opsi.

## Pakai sebagai skill agent

Repo ini juga berisi skill yang menjalankan CLI lalu mengubah hasilnya menjadi ringkasan kontribusi dan bullet CV.

```bash
npx skills add IlhamAufal/my-contribution
```

Lalu minta ke agent, misalnya: "Rangkum kontribusi saya di repo ini untuk CV."

Skill mendeteksi mode sendiri:
- Commit dari banyak orang: laporan per kontributor.
- Commit dari satu orang: kontribusi `git-verified`.
- Tidak ada history git: semua fitur diasumsikan dikerjakan sendiri (`self-declared`).

Cek skill terbaca dengan:

```bash
npx skills add IlhamAufal/my-contribution --list
```

## Lisensi

MIT
