/* =========================================================================
 * utils.js — Fungsi bantu format & konversi
 * ========================================================================= */
(function (global) {
  "use strict";

  const BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  /** Format angka -> "Rp 1.150.000" */
  function rupiah(n) {
    const v = Number(n) || 0;
    return "Rp " + Math.round(v).toLocaleString("id-ID");
  }

  /** Format angka tanpa prefix -> "1.150.000" */
  function numberID(n) {
    return (Number(n) || 0).toLocaleString("id-ID");
  }

  /** Parse string ber-titik/koma -> number */
  function parseAmount(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    const cleaned = String(str).replace(/[^\d,-]/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  /** ISO date (yyyy-mm-dd) -> "15 Juni 2026" */
  function tanggalID(iso) {
    if (!iso) return "";
    const d = iso instanceof Date ? iso : new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return iso;
    return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** ISO date -> "15 JUNI 2026" (kapital, gaya dokumen) */
  function tanggalIDUpper(iso) {
    return tanggalID(iso).toUpperCase();
  }

  function monthLabel(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return `${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  function roman(m) {
    return ROMAN[m] || "";
  }

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  /** Terbilang Indonesia: 1150000 -> "satu juta seratus lima puluh ribu" */
  function terbilang(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    function toWords(x) {
      if (x < 12) return satuan[x];
      if (x < 20) return toWords(x - 10) + " belas";
      if (x < 100) return toWords(Math.floor(x / 10)) + " puluh" + (x % 10 ? " " + satuan[x % 10] : "");
      if (x < 200) return "seratus" + (x % 100 ? " " + toWords(x % 100) : "");
      if (x < 1000) return satuan[Math.floor(x / 100)] + " ratus" + (x % 100 ? " " + toWords(x % 100) : "");
      if (x < 2000) return "seribu" + (x % 1000 ? " " + toWords(x % 1000) : "");
      if (x < 1000000) return toWords(Math.floor(x / 1000)) + " ribu" + (x % 1000 ? " " + toWords(x % 1000) : "");
      if (x < 1000000000) return toWords(Math.floor(x / 1000000)) + " juta" + (x % 1000000 ? " " + toWords(x % 1000000) : "");
      if (x < 1000000000000) return toWords(Math.floor(x / 1000000000)) + " miliar" + (x % 1000000000 ? " " + toWords(x % 1000000000) : "");
      return toWords(Math.floor(x / 1000000000000)) + " triliun" + (x % 1000000000000 ? " " + toWords(x % 1000000000000) : "");
    }
    if (n === 0) return "nol";
    return toWords(n).replace(/\s+/g, " ").trim();
  }

  function terbilangRupiah(n) {
    const w = terbilang(n);
    return (w.charAt(0).toUpperCase() + w.slice(1) + " rupiah").trim();
  }

  function escapeHTML(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** Baca File -> dataURL (base64) */
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  /** Kompres gambar (dataURL) agar ukuran simpan kecil. Maks lebar default 1280px. */
  function compressImage(dataURL, maxW, quality) {
    maxW = maxW || 1280;
    quality = quality || 0.8;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) {
          resolve(dataURL);
        }
      };
      img.onerror = () => resolve(dataURL);
      img.src = dataURL;
    });
  }

  function download(filename, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  global.U = {
    BULAN, uuid, nowISO, rupiah, numberID, parseAmount,
    tanggalID, tanggalIDUpper, monthLabel, roman, todayISO,
    terbilang, terbilangRupiah, escapeHTML, debounce,
    fileToDataURL, compressImage, download,
  };
})(window);
