/* =========================================================================
 * config.js — Pengaturan default aplikasi
 * ========================================================================= */
(function (global) {
  "use strict";

  const DEFAULT_SETTINGS = {
    companyName: "PT RUSTIKA GLOBAL INDONESIA",
    brandName: "RUSTIKA CONSULTANT",
    logo: null, // dataURL bila pakai logo unggahan, null = pakai assets/logo.svg
    defaultTitle: "OPERASIONAL OFFICE & BBM",
    defaultDepartment: "Keuangan",
    defaultDivision: "Admin Finance",
    defaultRequester: { role: "Admin Finance", name: "Sulpiani" },
    defaultApprover: { role: "Komisaris/PLT. Direktur", name: "Salman" },
    docCodePrefix: "RUSTIC/LOG-TP", // utk Document Code -> "091 RUSTIC/LOG-TP/VI/2026"
    receiptPrefix: "RUST/-KWT", // utk No. Kwitansi -> "015/RUST/-KWT/VI/2026"
    counter: 92, // nomor urut berikutnya
    banks: ["BNI: 1992650123 AN: Sulpiani"],
  };

  /** Gabungkan setting tersimpan dengan default (agar field baru tetap ada). */
  function withDefaults(saved) {
    const s = Object.assign({}, DEFAULT_SETTINGS, saved || {});
    s.defaultRequester = Object.assign({}, DEFAULT_SETTINGS.defaultRequester, (saved && saved.defaultRequester) || {});
    s.defaultApprover = Object.assign({}, DEFAULT_SETTINGS.defaultApprover, (saved && saved.defaultApprover) || {});
    if (!Array.isArray(s.banks)) s.banks = DEFAULT_SETTINGS.banks.slice();
    return s;
  }

  /** Format Document Code: "092 RUSTIC/LOG-TP/VI/2026" */
  function makeDocCode(settings, seq, dateISO) {
    const d = new Date((dateISO || U.todayISO()) + "T00:00:00");
    const seq3 = String(seq).padStart(3, "0");
    return `${seq3} ${settings.docCodePrefix}/${U.roman(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  /** Format No. Kwitansi: "092/RUST/-KWT/VI/2026" */
  function makeReceiptNo(settings, seq, dateISO) {
    const d = new Date((dateISO || U.todayISO()) + "T00:00:00");
    const seq3 = String(seq).padStart(3, "0");
    return `${seq3}/${settings.receiptPrefix}/${U.roman(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  global.CONFIG = { DEFAULT_SETTINGS, withDefaults, makeDocCode, makeReceiptNo };
})(window);
