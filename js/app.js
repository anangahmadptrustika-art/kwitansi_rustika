/* =========================================================================
 * app.js — Controller utama aplikasi Kwitansi Rustika
 * ========================================================================= */
(function () {
  "use strict";

  const esc = U.escapeHTML;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const App = {
    settings: null,
    receipts: [],
    draftProofs: [], // {data, caption} saat membuat/mengedit
    editingId: null,
  };

  /* ---------------------------------------------------------------- utils UI */
  function toast(msg, type) {
    const el = document.createElement("div");
    el.className = "toast " + (type || "ok");
    el.textContent = msg;
    $("#toast-host").appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const host = $("#modal-host");
      host.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <p>${esc(message)}</p>
            <div class="modal-actions">
              <button class="btn btn-ghost" data-act="no">Batal</button>
              <button class="btn btn-danger" data-act="yes">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>`;
      host.querySelector('[data-act="yes"]').onclick = () => { host.innerHTML = ""; resolve(true); };
      host.querySelector('[data-act="no"]').onclick = () => { host.innerHTML = ""; resolve(false); };
    });
  }

  /* ------------------------------------------------------------------ router */
  const routes = ["dashboard", "create", "list", "settings"];
  function currentRoute() {
    const h = (location.hash || "#dashboard").slice(1);
    const [name, param] = h.split("/");
    return { name, param };
  }

  async function navigate() {
    const { name, param } = currentRoute();
    $$(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.route === name));
    const view = $("#view");
    switch (name) {
      case "dashboard": return renderDashboard(view);
      case "create": return renderCreate(view, param || null);
      case "edit": return renderCreate(view, param || null);
      case "list": return renderList(view);
      case "view": return renderView(view, param);
      case "settings": return renderSettings(view);
      default: location.hash = "#dashboard";
    }
  }

  /* ============================================================== DASHBOARD */
  async function renderDashboard(view) {
    App.receipts = await DB.Receipts.all();
    const list = App.receipts;
    const total = list.reduce((s, r) => s + ReceiptTemplate.computeTotal(r), 0);
    const count = list.length;

    // bulan ini
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = list.filter((r) => (r.requestDate || "").slice(0, 7) === ym);
    const thisMonthTotal = thisMonth.reduce((s, r) => s + ReceiptTemplate.computeTotal(r), 0);

    // agregasi per bulan (12 terakhir)
    const byMonth = {};
    list.forEach((r) => {
      const key = (r.requestDate || r.createdAt || "").slice(0, 7);
      if (!key) return;
      byMonth[key] = (byMonth[key] || 0) + ReceiptTemplate.computeTotal(r);
    });
    const months = Object.keys(byMonth).sort().slice(-12);
    const maxVal = Math.max(1, ...months.map((m) => byMonth[m]));

    const bars = months.map((m) => {
      const h = Math.round((byMonth[m] / maxVal) * 100);
      const d = new Date(m + "-01T00:00:00");
      const lbl = U.BULAN[d.getMonth()].slice(0, 3) + " " + String(d.getFullYear()).slice(2);
      return `<div class="bar-col" title="${esc(U.monthLabel(m + "-01"))}: ${esc(U.rupiah(byMonth[m]))}">
        <div class="bar-val">${shortRp(byMonth[m])}</div>
        <div class="bar" style="height:${h}%"></div>
        <div class="bar-label">${esc(lbl)}</div>
      </div>`;
    }).join("");

    const recent = list.slice(0, 8).map((r) => `
      <tr>
        <td>${esc(U.tanggalID(r.requestDate))}</td>
        <td>${esc(r.receiptNo || "-")}</td>
        <td>${esc((r.items && r.items[0] && r.items[0].description) || r.title || "-")}</td>
        <td class="r">${esc(U.rupiah(ReceiptTemplate.computeTotal(r)))}</td>
        <td><a class="link" href="#view/${esc(r.id)}">Lihat</a></td>
      </tr>`).join("") || `<tr><td colspan="5" class="muted c">Belum ada kwitansi. <a class="link" href="#create">Buat sekarang</a>.</td></tr>`;

    view.innerHTML = `
      <div class="page-head">
        <div><h1>Dashboard</h1><p class="muted">Ringkasan kwitansi PT Rustika Global Indonesia</p></div>
        <a class="btn btn-primary" href="#create">+ Buat Kwitansi</a>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon">🧾</div>
          <div><div class="stat-num">${count}</div><div class="stat-lbl">Total Kwitansi</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div><div class="stat-num">${esc(U.rupiah(total))}</div><div class="stat-lbl">Total Nominal</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div><div class="stat-num">${esc(U.rupiah(thisMonthTotal))}</div><div class="stat-lbl">Bulan Ini (${thisMonth.length} kwitansi)</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div><div class="stat-num">${esc(U.rupiah(count ? total / count : 0))}</div><div class="stat-lbl">Rata-rata / Kwitansi</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Nominal per Bulan</h2></div>
        <div class="chart">${bars || '<p class="muted c">Belum ada data.</p>'}</div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Kwitansi Terbaru</h2><a class="link" href="#list">Lihat semua →</a></div>
        <table class="data-table">
          <thead><tr><th>Tanggal</th><th>No. Kwitansi</th><th>Keterangan</th><th class="r">Nominal</th><th></th></tr></thead>
          <tbody>${recent}</tbody>
        </table>
      </div>

      ${count === 0 ? `<div class="card import-hint">
        <h2>Mulai cepat</h2>
        <p class="muted">Impor ${"235"} data historis dari Excel Anda (April 2025 – Juni 2026) untuk mengisi dashboard.</p>
        <button class="btn btn-secondary" id="btn-import-seed">Impor Data Historis</button>
      </div>` : ""}
    `;

    const btnSeed = $("#btn-import-seed");
    if (btnSeed) btnSeed.onclick = importSeed;
  }

  function shortRp(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "jt";
    if (n >= 1e3) return Math.round(n / 1e3) + "rb";
    return String(n);
  }

  /* ================================================================ CREATE */
  function blankItem() { return { description: "", amount: 0, virtualAccount: "", remarks: "" }; }

  function itemRowHTML(it, i) {
    return `
      <tr class="item-row" data-i="${i}">
        <td class="c">${i + 1}.</td>
        <td><input class="inp it-desc" value="${esc(it.description || "")}" placeholder="Mis. Operasional Office [Bahan Makanan 4 Hari]"/></td>
        <td><input class="inp it-amount r" value="${it.amount ? U.numberID(it.amount) : ""}" inputmode="numeric" placeholder="0"/></td>
        <td><input class="inp it-va" value="${esc(it.virtualAccount || "")}" placeholder="BNI: 1992650123 AN: ..."/></td>
        <td><input class="inp it-remarks" value="${esc(it.remarks || "")}" placeholder=""/></td>
        <td class="c"><button class="icon-btn del-item" title="Hapus baris">✕</button></td>
      </tr>`;
  }

  async function renderCreate(view, editId) {
    const s = App.settings;
    let r;
    if (editId) {
      r = await DB.Receipts.get(editId);
      if (!r) { toast("Kwitansi tidak ditemukan", "err"); location.hash = "#list"; return; }
      App.editingId = editId;
      App.draftProofs = (r.transferProofs || []).map((p) => (typeof p === "string" ? { data: p, caption: "" } : p));
    } else {
      App.editingId = null;
      App.draftProofs = [];
      const today = U.todayISO();
      r = {
        title: s.defaultTitle,
        documentCode: CONFIG.makeDocCode(s, s.counter, today),
        version: String(s.counter).padStart(3, "0") + " I",
        effectiveDate: today,
        department: s.defaultDepartment,
        requestDate: today,
        requestedBy: s.defaultRequester.name,
        division: s.defaultDivision,
        receiptNo: CONFIG.makeReceiptNo(s, s.counter, today),
        items: [blankItem()],
        requester: Object.assign({}, s.defaultRequester),
        approver: Object.assign({}, s.defaultApprover),
        notes: "",
      };
    }

    view.innerHTML = `
      <div class="page-head">
        <div><h1>${editId ? "Edit" : "Buat"} Kwitansi</h1><p class="muted">Isi formulir, bukti transfer tampil di bawah kwitansi.</p></div>
        <a class="btn btn-ghost" href="#list">← Kembali</a>
      </div>

      <div class="create-layout">
        <form id="kw-form" class="card form">
          <fieldset>
            <legend>Kop Dokumen</legend>
            <label>Judul Dokumen <input class="inp" name="title" value="${esc(r.title || "")}"/></label>
            <div class="row-2">
              <label>Document Code <input class="inp" name="documentCode" value="${esc(r.documentCode || "")}"/></label>
              <label>Version <input class="inp" name="version" value="${esc(r.version || "")}"/></label>
            </div>
            <div class="row-2">
              <label>Effective Date <input class="inp" type="date" name="effectiveDate" value="${esc(r.effectiveDate || "")}"/></label>
              <label>Department <input class="inp" name="department" value="${esc(r.department || "")}"/></label>
            </div>
            <label>No. Kwitansi <input class="inp" name="receiptNo" value="${esc(r.receiptNo || "")}"/></label>
          </fieldset>

          <fieldset>
            <legend>A. Request Information</legend>
            <div class="row-2">
              <label>Request Date <input class="inp" type="date" name="requestDate" value="${esc(r.requestDate || "")}"/></label>
              <label>Requested By <input class="inp" name="requestedBy" value="${esc(r.requestedBy || "")}"/></label>
            </div>
            <label>Departemen/Divisi <input class="inp" name="division" value="${esc(r.division || "")}"/></label>
          </fieldset>

          <fieldset>
            <legend>B. Request Details</legend>
            <table class="item-table">
              <thead><tr><th>No</th><th>Description</th><th>Amount</th><th>Virtual Account Number</th><th>Remarks</th><th></th></tr></thead>
              <tbody id="item-body">${r.items.map(itemRowHTML).join("")}</tbody>
              <tfoot><tr><td colspan="2" class="r"><strong>TOTAL</strong></td><td class="r"><strong id="total-cell">Rp 0</strong></td><td colspan="2"></td></tr></tfoot>
            </table>
            <button type="button" class="btn btn-ghost btn-sm" id="add-item">+ Tambah Baris</button>
            <div id="terbilang-line" class="muted small"></div>
            <label>Catatan (opsional) <textarea class="inp" name="notes" rows="2">${esc(r.notes || "")}</textarea></label>
          </fieldset>

          <fieldset>
            <legend>Tanda Tangan</legend>
            <div class="row-2">
              <div>
                <div class="sub-legend">Yang Mengajukan</div>
                <label>Jabatan <input class="inp" name="reqRole" value="${esc(r.requester.role || "")}"/></label>
                <label>Nama <input class="inp" name="reqName" value="${esc(r.requester.name || "")}"/></label>
              </div>
              <div>
                <div class="sub-legend">Menyetujui</div>
                <label>Jabatan <input class="inp" name="appRole" value="${esc(r.approver.role || "")}"/></label>
                <label>Nama <input class="inp" name="appName" value="${esc(r.approver.name || "")}"/></label>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Bukti Transfer</legend>
            <p class="muted small">Unggah satu atau beberapa gambar bukti transfer. Akan tampil di bawah kwitansi.</p>
            <input type="file" id="proof-input" accept="image/*" multiple class="file-input"/>
            <div id="proof-list" class="proof-thumbs"></div>
          </fieldset>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">💾 Simpan</button>
            <button type="button" class="btn btn-secondary" id="btn-save-print">💾 Simpan &amp; Cetak</button>
            <a class="btn btn-ghost" href="#list">Batal</a>
          </div>
        </form>

        <div class="preview-pane">
          <div class="preview-head"><span>Pratinjau</span><button class="btn btn-ghost btn-sm" id="btn-print-preview">🖨️ Cetak</button></div>
          <div id="preview-scroll" class="preview-scroll"></div>
        </div>
      </div>
    `;

    // ----- event wiring -----
    const form = $("#kw-form");
    const itemBody = $("#item-body");

    function readItems() {
      return $$(".item-row", itemBody).map((tr) => ({
        description: $(".it-desc", tr).value.trim(),
        amount: U.parseAmount($(".it-amount", tr).value),
        virtualAccount: $(".it-va", tr).value.trim(),
        remarks: $(".it-remarks", tr).value.trim(),
      }));
    }

    function gather() {
      const items = readItems();
      // NB: pakai form.elements agar nama field tidak bentrok dgn properti
      // bawaan elemen (mis. "title" = HTMLElement.title).
      const f = form.elements;
      return {
        title: f.title.value.trim(),
        documentCode: f.documentCode.value.trim(),
        version: f.version.value.trim(),
        effectiveDate: f.effectiveDate.value,
        department: f.department.value.trim(),
        receiptNo: f.receiptNo.value.trim(),
        requestDate: f.requestDate.value,
        requestedBy: f.requestedBy.value.trim(),
        division: f.division.value.trim(),
        items,
        notes: f.notes.value.trim(),
        requester: { role: f.reqRole.value.trim(), name: f.reqName.value.trim() },
        approver: { role: f.appRole.value.trim(), name: f.appName.value.trim() },
        transferProofs: App.draftProofs.slice(),
      };
    }

    function refreshNumbering() {
      $$(".item-row", itemBody).forEach((tr, i) => {
        tr.dataset.i = i;
        tr.querySelector("td.c").textContent = i + 1 + ".";
      });
    }

    function updateTotalsAndPreview() {
      const data = gather();
      const total = ReceiptTemplate.computeTotal(data);
      $("#total-cell").textContent = U.rupiah(total);
      $("#terbilang-line").textContent = total ? "Terbilang: " + U.terbilangRupiah(total) : "";
      $("#preview-scroll").innerHTML = ReceiptTemplate.render(Object.assign({ id: App.editingId }, data), s);
    }
    const debouncedPreview = U.debounce(updateTotalsAndPreview, 200);

    form.addEventListener("input", debouncedPreview);

    $("#add-item").onclick = () => {
      const i = $$(".item-row", itemBody).length;
      itemBody.insertAdjacentHTML("beforeend", itemRowHTML(blankItem(), i));
      updateTotalsAndPreview();
    };
    itemBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("del-item")) {
        e.preventDefault();
        if ($$(".item-row", itemBody).length > 1) e.target.closest("tr").remove();
        else { toast("Minimal 1 baris", "warn"); return; }
        refreshNumbering();
        updateTotalsAndPreview();
      }
    });

    // bukti transfer
    function renderProofs() {
      const host = $("#proof-list");
      host.innerHTML = App.draftProofs.map((p, i) => `
        <div class="proof-thumb" data-i="${i}">
          <img src="${esc(p.data)}" alt="bukti"/>
          <input class="inp proof-cap" placeholder="Keterangan (opsional)" value="${esc(p.caption || "")}"/>
          <button type="button" class="icon-btn del-proof" title="Hapus">✕</button>
        </div>`).join("");
    }
    renderProofs();
    updateTotalsAndPreview();

    $("#proof-input").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        const url = await U.fileToDataURL(f);
        const compressed = await U.compressImage(url, 1280, 0.82);
        App.draftProofs.push({ data: compressed, caption: "" });
      }
      e.target.value = "";
      renderProofs();
      updateTotalsAndPreview();
      if (files.length) toast(files.length + " bukti transfer ditambahkan");
    });
    $("#proof-list").addEventListener("click", (e) => {
      if (e.target.classList.contains("del-proof")) {
        const i = +e.target.closest(".proof-thumb").dataset.i;
        App.draftProofs.splice(i, 1);
        renderProofs();
        updateTotalsAndPreview();
      }
    });
    $("#proof-list").addEventListener("input", (e) => {
      if (e.target.classList.contains("proof-cap")) {
        const i = +e.target.closest(".proof-thumb").dataset.i;
        App.draftProofs[i].caption = e.target.value;
      }
    });

    async function doSave(thenPrint) {
      const data = gather();
      if (!data.items.some((it) => it.description || it.amount)) {
        toast("Isi minimal satu item di Request Details", "err");
        return null;
      }
      const isNew = !App.editingId;
      const rec = Object.assign({}, editId ? r : {}, data, {
        id: App.editingId || U.uuid(),
        updatedAt: U.nowISO(),
        createdAt: (r && r.createdAt) || U.nowISO(),
      });
      await DB.Receipts.put(rec);
      if (isNew) {
        // naikkan counter agar nomor berikutnya unik
        App.settings.counter = (App.settings.counter || 1) + 1;
        await DB.Settings.set("app", App.settings);
      }
      toast("Kwitansi tersimpan ✓");
      if (thenPrint) {
        location.hash = "#view/" + rec.id;
        setTimeout(() => window.print(), 600);
      } else {
        location.hash = "#view/" + rec.id;
      }
      return rec;
    }

    form.addEventListener("submit", (e) => { e.preventDefault(); doSave(false); });
    $("#btn-save-print").onclick = () => doSave(true);
    $("#btn-print-preview").onclick = () => {
      printNode(ReceiptTemplate.render(Object.assign({ id: "preview" }, gather()), s));
    };
  }

  /* ================================================================== VIEW */
  async function renderView(view, id) {
    const r = await DB.Receipts.get(id);
    if (!r) { toast("Kwitansi tidak ditemukan", "err"); location.hash = "#list"; return; }
    view.innerHTML = `
      <div class="page-head no-print">
        <div><h1>Detail Kwitansi</h1><p class="muted">${esc(r.receiptNo || "")}</p></div>
        <div class="btn-group">
          <button class="btn btn-secondary" id="v-print">🖨️ Cetak / PDF</button>
          <a class="btn btn-ghost" href="#edit/${esc(r.id)}">✏️ Edit</a>
          <button class="btn btn-danger" id="v-del">🗑️ Hapus</button>
          <a class="btn btn-ghost" href="#list">← Daftar</a>
        </div>
      </div>
      <div class="doc-frame" id="doc-frame">${ReceiptTemplate.render(r, App.settings)}</div>
    `;
    $("#v-print").onclick = () => window.print();
    $("#v-del").onclick = async () => {
      if (await confirmDialog("Hapus kwitansi ini secara permanen?")) {
        await DB.Receipts.remove(id);
        toast("Kwitansi dihapus");
        location.hash = "#list";
      }
    };
  }

  /* ================================================================== LIST */
  async function renderList(view) {
    App.receipts = await DB.Receipts.all();
    const monthsSet = Array.from(new Set(App.receipts.map((r) => (r.requestDate || "").slice(0, 7)).filter(Boolean))).sort().reverse();
    view.innerHTML = `
      <div class="page-head">
        <div><h1>Daftar Kwitansi</h1><p class="muted">${App.receipts.length} kwitansi tersimpan</p></div>
        <a class="btn btn-primary" href="#create">+ Buat Kwitansi</a>
      </div>
      <div class="card">
        <div class="list-toolbar">
          <input class="inp" id="search" placeholder="🔍 Cari keterangan / nomor / nama..."/>
          <select class="inp" id="month-filter">
            <option value="">Semua Bulan</option>
            ${monthsSet.map((m) => `<option value="${esc(m)}">${esc(U.monthLabel(m + "-01"))}</option>`).join("")}
          </select>
          <button class="btn btn-ghost" id="exp-csv">⬇️ CSV</button>
          <button class="btn btn-ghost" id="exp-json">⬇️ Backup</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Tanggal</th><th>No. Kwitansi</th><th>Keterangan</th><th class="r">Nominal</th><th>Bukti</th><th></th></tr></thead>
          <tbody id="list-body"></tbody>
        </table>
      </div>`;

    function draw() {
      const q = $("#search").value.toLowerCase().trim();
      const mf = $("#month-filter").value;
      const rows = App.receipts.filter((r) => {
        if (mf && (r.requestDate || "").slice(0, 7) !== mf) return false;
        if (!q) return true;
        const hay = [r.receiptNo, r.title, r.requestedBy, (r.items || []).map((i) => i.description).join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      });
      $("#list-body").innerHTML = rows.map((r) => `
        <tr>
          <td>${esc(U.tanggalID(r.requestDate))}</td>
          <td>${esc(r.receiptNo || "-")}</td>
          <td>${esc((r.items && r.items[0] && r.items[0].description) || r.title || "-")}${(r.items && r.items.length > 1) ? ` <span class="muted">(+${r.items.length - 1})</span>` : ""}</td>
          <td class="r">${esc(U.rupiah(ReceiptTemplate.computeTotal(r)))}</td>
          <td class="c">${(r.transferProofs && r.transferProofs.length) ? "📎 " + r.transferProofs.length : "-"}</td>
          <td class="c nowrap">
            <a class="link" href="#view/${esc(r.id)}">Lihat</a>
            <a class="link" href="#edit/${esc(r.id)}">Edit</a>
            <a class="link danger" data-del="${esc(r.id)}" href="#list">Hapus</a>
          </td>
        </tr>`).join("") || `<tr><td colspan="6" class="muted c">Tidak ada data.</td></tr>`;
    }
    draw();
    $("#search").addEventListener("input", U.debounce(draw, 150));
    $("#month-filter").addEventListener("change", draw);
    $("#list-body").addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-del");
      if (id) {
        e.preventDefault();
        if (await confirmDialog("Hapus kwitansi ini?")) {
          await DB.Receipts.remove(id);
          App.receipts = await DB.Receipts.all();
          draw();
          toast("Dihapus");
        }
      }
    });
    $("#exp-csv").onclick = exportCSV;
    $("#exp-json").onclick = exportBackup;
  }

  /* ============================================================== SETTINGS */
  async function renderSettings(view) {
    const s = App.settings;
    view.innerHTML = `
      <div class="page-head"><div><h1>Pengaturan</h1><p class="muted">Identitas perusahaan, logo, dan default kwitansi</p></div></div>

      <form id="set-form" class="card form" style="max-width:760px">
        <fieldset>
          <legend>Identitas & Logo</legend>
          <label>Nama Perusahaan <input class="inp" name="companyName" value="${esc(s.companyName)}"/></label>
          <label>Brand <input class="inp" name="brandName" value="${esc(s.brandName)}"/></label>
          <div class="logo-row">
            <div class="logo-preview"><img id="logo-img" src="${esc(s.logo || window.DEFAULT_LOGO || "assets/logo.svg")}" alt="logo"/></div>
            <div>
              <input type="file" id="logo-input" accept="image/*" class="file-input"/>
              <p class="muted small">Unggah logo asli (PNG/JPG/SVG). Kosongkan untuk pakai logo bawaan.</p>
              <button type="button" class="btn btn-ghost btn-sm" id="logo-reset">Pakai Logo Bawaan</button>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Default Kwitansi</legend>
          <label>Judul Dokumen Default <input class="inp" name="defaultTitle" value="${esc(s.defaultTitle)}"/></label>
          <div class="row-2">
            <label>Department <input class="inp" name="defaultDepartment" value="${esc(s.defaultDepartment)}"/></label>
            <label>Departemen/Divisi <input class="inp" name="defaultDivision" value="${esc(s.defaultDivision)}"/></label>
          </div>
          <div class="row-2">
            <label>Prefix No. Kwitansi <input class="inp" name="receiptPrefix" value="${esc(s.receiptPrefix)}"/></label>
            <label>Prefix Document Code <input class="inp" name="docCodePrefix" value="${esc(s.docCodePrefix)}"/></label>
          </div>
          <label>Nomor Urut Berikutnya <input class="inp" type="number" name="counter" value="${esc(s.counter)}" min="1" style="max-width:160px"/></label>
        </fieldset>

        <fieldset>
          <legend>Penanda Tangan Default</legend>
          <div class="row-2">
            <div>
              <div class="sub-legend">Yang Mengajukan</div>
              <label>Jabatan <input class="inp" name="reqRole" value="${esc(s.defaultRequester.role)}"/></label>
              <label>Nama <input class="inp" name="reqName" value="${esc(s.defaultRequester.name)}"/></label>
            </div>
            <div>
              <div class="sub-legend">Menyetujui</div>
              <label>Jabatan <input class="inp" name="appRole" value="${esc(s.defaultApprover.role)}"/></label>
              <label>Nama <input class="inp" name="appName" value="${esc(s.defaultApprover.name)}"/></label>
            </div>
          </div>
        </fieldset>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 Simpan Pengaturan</button>
        </div>
      </form>

      <div class="card" style="max-width:760px">
        <h2>Data & Cadangan</h2>
        <div class="btn-group" style="flex-wrap:wrap;gap:8px">
          <button class="btn btn-secondary" id="set-import-seed">Impor Data Historis (Excel)</button>
          <button class="btn btn-ghost" id="set-export">⬇️ Export Backup (JSON)</button>
          <label class="btn btn-ghost" style="cursor:pointer">⬆️ Import Backup<input type="file" id="set-import-file" accept="application/json" hidden/></label>
          <button class="btn btn-danger" id="set-wipe">🗑️ Hapus Semua Kwitansi</button>
        </div>
        <p class="muted small">Semua data tersimpan lokal di browser ini (IndexedDB). Gunakan Export untuk cadangan/pindah perangkat.</p>
      </div>
    `;

    const form = $("#set-form");

    $("#logo-input").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const url = await U.fileToDataURL(f);
      const out = f.type === "image/svg+xml" ? url : await U.compressImage(url, 600, 0.9);
      $("#logo-img").src = out;
      form.dataset.logo = out;
    });
    $("#logo-reset").onclick = () => { $("#logo-img").src = window.DEFAULT_LOGO || "assets/logo.svg"; form.dataset.logo = ""; };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ns = Object.assign({}, App.settings, {
        companyName: form.companyName.value.trim(),
        brandName: form.brandName.value.trim(),
        defaultTitle: form.defaultTitle.value.trim(),
        defaultDepartment: form.defaultDepartment.value.trim(),
        defaultDivision: form.defaultDivision.value.trim(),
        receiptPrefix: form.receiptPrefix.value.trim(),
        docCodePrefix: form.docCodePrefix.value.trim(),
        counter: parseInt(form.counter.value, 10) || 1,
        defaultRequester: { role: form.reqRole.value.trim(), name: form.reqName.value.trim() },
        defaultApprover: { role: form.appRole.value.trim(), name: form.appName.value.trim() },
      });
      if (form.dataset.logo !== undefined) ns.logo = form.dataset.logo || null;
      App.settings = ns;
      await DB.Settings.set("app", ns);
      toast("Pengaturan disimpan ✓");
    });

    $("#set-import-seed").onclick = importSeed;
    $("#set-export").onclick = exportBackup;
    $("#set-wipe").onclick = async () => {
      if (await confirmDialog("Hapus SEMUA kwitansi? Tindakan ini tidak bisa dibatalkan.")) {
        await DB.Receipts.clear();
        toast("Semua kwitansi dihapus");
        navigate();
      }
    };
    $("#set-import-file").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const obj = JSON.parse(text);
        const recs = obj.receipts || obj;
        if (!Array.isArray(recs)) throw new Error("format");
        await DB.Receipts.bulkPut(recs);
        if (obj.settings) { App.settings = CONFIG.withDefaults(obj.settings); await DB.Settings.set("app", App.settings); }
        toast(recs.length + " kwitansi diimpor ✓");
        navigate();
      } catch (err) {
        toast("File backup tidak valid", "err");
      }
    });
  }

  /* ============================================================ DATA TOOLS */
  async function importSeed() {
    try {
      const res = await fetch("data/seed.json");
      const seed = await res.json();
      const existing = await DB.Receipts.all();
      const known = new Set(existing.map((r) => r._seedKey).filter(Boolean));
      const recs = [];
      seed.forEach((row, idx) => {
        const seedKey = `${row.date || "x"}|${row.receiptNo || ""}|${row.description}|${row.amount}|${idx}`;
        if (known.has(seedKey)) return;
        recs.push({
          id: U.uuid(),
          _seedKey: seedKey,
          createdAt: (row.date || U.todayISO()) + "T08:00:00.000Z",
          updatedAt: U.nowISO(),
          title: App.settings.defaultTitle,
          documentCode: "",
          version: "",
          effectiveDate: row.date || "",
          department: App.settings.defaultDepartment,
          requestDate: row.date || "",
          requestedBy: App.settings.defaultRequester.name,
          division: App.settings.defaultDivision,
          receiptNo: row.receiptNo || "",
          items: [{ description: row.description, amount: row.amount, virtualAccount: "", remarks: "" }],
          requester: Object.assign({}, App.settings.defaultRequester),
          approver: Object.assign({}, App.settings.defaultApprover),
          notes: row.method ? "Metode: " + row.method : "",
          transferProofs: [],
        });
      });
      if (!recs.length) { toast("Data historis sudah diimpor sebelumnya", "warn"); return; }
      await DB.Receipts.bulkPut(recs);
      toast(recs.length + " kwitansi historis diimpor ✓");
      navigate();
    } catch (err) {
      toast("Gagal memuat data historis", "err");
      console.error(err);
    }
  }

  async function exportBackup() {
    const receipts = await DB.Receipts.all();
    const payload = { app: "kwitansi-rustika", exportedAt: U.nowISO(), settings: App.settings, receipts };
    U.download(`backup-kwitansi-${U.todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast("Backup diunduh");
  }

  async function exportCSV() {
    const receipts = await DB.Receipts.all();
    const head = ["Tanggal", "No. Kwitansi", "Keterangan", "Nominal", "Catatan"];
    const lines = [head.join(",")];
    receipts.forEach((r) => {
      const desc = (r.items || []).map((i) => i.description).join(" | ").replace(/"/g, '""');
      lines.push([
        r.requestDate || "",
        `"${(r.receiptNo || "").replace(/"/g, '""')}"`,
        `"${desc}"`,
        ReceiptTemplate.computeTotal(r),
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ].join(","));
    });
    U.download(`kwitansi-${U.todayISO()}.csv`, "﻿" + lines.join("\n"), "text/csv");
    toast("CSV diunduh");
  }

  /* ============================================================== PRINTING */
  // Cetak node tertentu (mis. dari pratinjau) lewat iframe tersembunyi.
  function printNode(html) {
    const wrap = document.createElement("div");
    wrap.className = "print-only doc-frame";
    wrap.id = "adhoc-print";
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    document.body.classList.add("printing-adhoc");
    window.print();
    setTimeout(() => { wrap.remove(); document.body.classList.remove("printing-adhoc"); }, 500);
  }

  /* ================================================================== INIT */
  // Pakai assets/logo.png sebagai logo bawaan bila tersedia (cukup unggah file
  // tersebut ke repo), jika tidak ada gunakan assets/logo.svg.
  function resolveDefaultLogo() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const img = new Image();
      img.onload = () => finish("assets/logo.png");
      img.onerror = () => finish("assets/logo.svg");
      img.src = "assets/logo.png?v=" + Date.now();
      setTimeout(() => finish("assets/logo.svg"), 1500);
    });
  }

  async function init() {
    window.DEFAULT_LOGO = await resolveDefaultLogo();
    // terapkan ke favicon & logo sidebar
    const fav = document.querySelector('link[rel="icon"]');
    if (fav) fav.href = window.DEFAULT_LOGO;
    const brand = document.querySelector(".brand-logo");
    if (brand) brand.src = window.DEFAULT_LOGO;

    const saved = await DB.Settings.get("app");
    App.settings = CONFIG.withDefaults(saved);
    if (!saved) await DB.Settings.set("app", App.settings);

    window.addEventListener("hashchange", navigate);
    navigate();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.App = App;
})();
