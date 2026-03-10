# Link Hub (IndexedDB)

Website statis untuk menghimpun banyak link (website terpisah) dalam bentuk **card** dengan tampilan modern-clean. Data tersimpan **persisten** di browser via **IndexedDB** (bukan server), jadi kamu bisa tambah/edit/hapus link secara dinamis.

## Cara pakai

- Buka file `index.html` di browser (double click) untuk **login**.
- Setelah login berhasil, kamu akan diarahkan ke `dashboard.html`.
- Klik **Tambah link** untuk menambahkan.
- **Ctrl+K** untuk fokus ke pencarian.

## Fitur

- Card grid responsif (mobile/tablet/desktop)
- Tambah / Edit / Hapus link
- Pencarian + sorting
- Export / Import JSON
- Penyimpanan: IndexedDB (`linkhub-db`)

## Catatan penting

- URL wajib `http://` atau `https://`
- Data tersimpan di browser/perangkat yang kamu pakai. Kalau pindah browser/perangkat, gunakan **Export/Import**.

