/* =========================================================================
 * receipt.js — Render dokumen kwitansi (mengikuti format contoh foto)
 * Menghasilkan HTML siap-cetak: kop+logo, Request Information,
 * Request Details (tabel), tanda tangan, dan lampiran bukti transfer.
 * ========================================================================= */
(function (global) {
  "use strict";

  const esc = U.escapeHTML;

  function logoSrc(settings) {
    if (settings && settings.logo) return settings.logo;
    return "assets/logo.svg";
  }

  function computeTotal(receipt) {
    return (receipt.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
  }

  function itemsRows(items) {
    if (!items || !items.length) {
      return `<tr><td class="c">1.</td><td>-</td><td class="r">Rp 0</td><td></td><td></td></tr>`;
    }
    return items
      .map(
        (it, i) => `
        <tr>
          <td class="c">${i + 1}.</td>
          <td>${esc(it.description || "")}</td>
          <td class="r">${U.rupiah(it.amount)}</td>
          <td class="c va">${esc(it.virtualAccount || "")}</td>
          <td class="c">${esc(it.remarks || "")}</td>
        </tr>`
      )
      .join("");
  }

  function proofsBlock(receipt) {
    const proofs = receipt.transferProofs || [];
    if (!proofs.length) return "";
    const imgs = proofs
      .map(
        (p) => `<figure class="proof"><img src="${esc(p.data || p)}" alt="Bukti Transfer"/>${
          p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""
        }</figure>`
      )
      .join("");
    return `
      <section class="kw-proofs">
        <h3 class="kw-proof-title">BUKTI TRANSFER</h3>
        <div class="kw-proof-grid">${imgs}</div>
      </section>`;
  }

  function sign(label, role, name, sigData) {
    return `
      <div class="kw-sign">
        <div class="kw-sign-top">${esc(label)},</div>
        <div class="kw-sign-role">${esc(role || "")}</div>
        <div class="kw-sign-space">${sigData ? `<img src="${esc(sigData)}" alt="ttd"/>` : ""}</div>
        <div class="kw-sign-name">(${esc((name || "").toUpperCase())})</div>
      </div>`;
  }

  /**
   * render(receipt, settings) -> string HTML
   * Bungkus hasil dalam elemen ber-class "kwitansi-doc".
   */
  function render(receipt, settings) {
    settings = settings || {};
    const total = computeTotal(receipt);
    const terbilang = U.terbilangRupiah(total);

    return `
    <article class="kwitansi-doc" data-id="${esc(receipt.id || "")}">
      <!-- KOP -->
      <header class="kw-head">
        <img class="kw-logo" src="${esc(logoSrc(settings))}" alt="Logo"/>
        <div class="kw-head-text">
          <div class="kw-title">${esc(receipt.title || "OPERASIONAL OFFICE & BBM")}</div>
          <div class="kw-meta"><strong>Document Code:</strong> ${esc(receipt.documentCode || "")}</div>
          <div class="kw-meta"><strong>Version:</strong> ${esc(receipt.version || "")}${
            receipt.effectiveDate
              ? ` &nbsp; <strong>Effective Date:</strong> ${esc(U.tanggalIDUpper(receipt.effectiveDate))}`
              : ""
          }</div>
          <div class="kw-meta"><strong>Department:</strong> ${esc(receipt.department || "")}</div>
        </div>
      </header>

      <div class="kw-receiptno">${receipt.receiptNo ? "No. Kwitansi: " + esc(receipt.receiptNo) : ""}</div>

      <!-- A. REQUEST INFORMATION -->
      <section class="kw-section">
        <h2 class="kw-h2">A. &nbsp;REQUEST INFORMATION</h2>
        <ul class="kw-info">
          <li>Request Date: ${esc(U.tanggalIDUpper(receipt.requestDate))}</li>
          <li>Requested By: ${esc(receipt.requestedBy || "")}</li>
          <li>Departemen/Divisi: ${esc(receipt.division || "")}</li>
        </ul>
      </section>

      <!-- B. REQUEST DETAILS -->
      <section class="kw-section">
        <h2 class="kw-h2">B. &nbsp;REQUEST DETAILS</h2>
        <table class="kw-table">
          <thead>
            <tr>
              <th style="width:6%">No</th>
              <th style="width:38%">Description</th>
              <th style="width:20%">Amount</th>
              <th style="width:24%">Virtual Account Number</th>
              <th style="width:12%">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows(receipt.items)}
          </tbody>
          <tfoot>
            <tr class="kw-total">
              <td colspan="2" class="r"><strong>TOTAL AMOUNT</strong></td>
              <td class="r"><strong>${U.rupiah(total)}</strong></td>
              <td></td><td></td>
            </tr>
          </tfoot>
        </table>
        <div class="kw-terbilang"><em>Terbilang: ${esc(terbilang)}</em></div>
        ${receipt.notes ? `<div class="kw-notes"><strong>Catatan:</strong> ${esc(receipt.notes)}</div>` : ""}
      </section>

      <!-- TANDA TANGAN -->
      <section class="kw-signs">
        ${sign("Yang Mengajukan", (receipt.requester && receipt.requester.role) || "Admin Finance",
                (receipt.requester && receipt.requester.name) || "", receipt.requester && receipt.requester.signature)}
        ${sign("Menyetujui", (receipt.approver && receipt.approver.role) || "Komisaris/PLT. Direktur",
                (receipt.approver && receipt.approver.name) || "", receipt.approver && receipt.approver.signature)}
      </section>

      <!-- LAMPIRAN BUKTI TRANSFER -->
      ${proofsBlock(receipt)}
    </article>`;
  }

  global.ReceiptTemplate = { render, computeTotal };
})(window);
