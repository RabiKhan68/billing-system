(function(){
  // Utilities
  const fmt = (v, dp=2) => {
    // format numbers with thousand separators, using en-IN style for lakhs if available
    if (isNaN(v) || v === null) return '0.00';
    const n = Number(v);
    // use toLocaleString but fallback if not supported
    try {
      return n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    } catch(e){
      return n.toFixed(dp);
    }
  };

  const parseNum = (str) => {
    if (str === null || str === undefined || str === '') return 0;
    // remove commas
    const clean = String(str).replace(/,/g, '');
    const n = Number(clean);
    return isNaN(n) ? 0 : n;
  };

  const itemsBody = document.getElementById('itemsBody');
  const totalPcsEl = document.getElementById('totalPcs');
  const totalSqftEl = document.getElementById('totalSqft');
  const totalAmountEl = document.getElementById('totalAmount');
  const gstInput = document.getElementById('gstInput');
  const gstPercentLabel = document.getElementById('gstPercentLabel');
  const subtotalEl = document.getElementById('subtotal');
  const gstAmountEl = document.getElementById('gstAmount');
  const grandTotalEl = document.getElementById('grandTotal');

  // Add initial row(s)
  function addRow(data = {}) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="date" class="inp plc-date" value="${data.plcDate || ''}"></td>
      <td><input type="text" class="inp plc-gp" value="${data.plcGp || ''}"></td>
      <td><input type="date" class="inp pg-date" value="${data.pgDate || ''}"></td>
      <td><input type="text" class="inp pg-no" value="${data.pgNo || ''}"></td>
      <td><input type="text" class="inp article" value="${data.article || ''}"></td>
      <td><input type="number" min="0" step="1" class="inp pcs numField" value="${data.pcs || ''}"></td>
      <td><input type="number" min="0" step="0.01" class="inp sqft numField" value="${data.sqft || ''}"></td>
      <td><input type="number" min="0" step="0.01" class="inp rate numField" value="${data.rate || ''}"></td>
      <td><input type="text" readonly class="inp amount num" value="${data.amount ? fmt(data.amount) : '0.00'}"></td>
      <td class="no-print"><button class="removeBtn">Remove</button></td>
    `;
    itemsBody.appendChild(tr);
    // attach listeners for auto-calc
    ['pcs','sqft','rate'].forEach(cls=>{
      const el = tr.querySelector('.' + cls);
      if (el) el.addEventListener('input', recalcFromRow);
    });
    recalcAll();
  }

  // remove row
  itemsBody.addEventListener('click', function(e){
    if (e.target.classList.contains('removeBtn')) {
      const tr = e.target.closest('tr');
      if (tr) {
        tr.remove();
        recalcAll();
      }
    }
  });

  // calc amount for a row and update totals
  function recalcFromRow(e){
    const tr = e.target.closest('tr');
    if (!tr) return;
    const sqft = parseNum(tr.querySelector('.sqft').value);
    const rate = parseNum(tr.querySelector('.rate').value);
    const amount = sqft * rate;
    tr.querySelector('.amount').value = fmt(amount, 2);
    recalcAll();
  }

  function recalcAll(){
    let sumPcs = 0;
    let sumSqft = 0;
    let sumAmount = 0;
    const rows = itemsBody.querySelectorAll('tr');
    rows.forEach(tr=>{
      const pcs = parseNum(tr.querySelector('.pcs').value);
      const sqft = parseNum(tr.querySelector('.sqft').value);
      const rate = parseNum(tr.querySelector('.rate').value);
      const amount = sqft * rate;
      // update amount field in case not updated
      const amtField = tr.querySelector('.amount');
      if (amtField) amtField.value = fmt(amount, 2);
      sumPcs += pcs;
      sumSqft += sqft;
      sumAmount += amount;
    });
    totalPcsEl.textContent = String(sumPcs);
    totalSqftEl.textContent = fmt(sumSqft, 2);
    totalAmountEl.textContent = fmt(sumAmount, 2);

    // subtotal (same as sumAmount)
    subtotalEl.value = fmt(sumAmount, 2);

    // gst
    const gstPct = parseNum(gstInput.value);
    gstPercentLabel.textContent = (gstPct || 0).toString();
    const gstAmt = (sumAmount * (gstPct / 100));
    gstAmountEl.value = fmt(gstAmt, 2);

    const grand = sumAmount + gstAmt;
    grandTotalEl.value = fmt(grand, 2);
  }

  // Hook GST changes
  gstInput.addEventListener('input', function(){
    recalcAll();
  });

  // Buttons
  document.getElementById('addRowBtn').addEventListener('click', ()=> addRow());
  document.getElementById('clearBtn').addEventListener('click', ()=>{
    if (!confirm('Clear all rows?')) return;
    itemsBody.innerHTML = '';
    recalcAll();
  });

  // Print logic: prepare a printable HTML snapshot and print
  document.getElementById('printBtn').addEventListener('click', function(){
    const rows = [];
    itemsBody.querySelectorAll('tr').forEach(tr=>{
      rows.push({
        plcDate: tr.querySelector('.plc-date').value,
        plcGp: tr.querySelector('.plc-gp').value,
        pgDate: tr.querySelector('.pg-date').value,
        pgNo: tr.querySelector('.pg-no').value,
        article: tr.querySelector('.article').value,
        pcs: parseNum(tr.querySelector('.pcs').value),
        sqft: parseNum(tr.querySelector('.sqft').value),
        rate: parseNum(tr.querySelector('.rate').value),
        amount: parseNum(tr.querySelector('.sqft').value) * parseNum(tr.querySelector('.rate').value)
      });
    });

    const subtotal = parseNum(subtotalEl.value);
    const gstPct = parseNum(gstInput.value);
    const gstAmt = parseNum(gstAmountEl.value);
    const grand = parseNum(grandTotalEl.value);
    const salesInvoice = document.getElementById('salesInvoiceChk').checked;

    // Build printable HTML
    let html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice Print</title>
          <style>
            body{ font-family: Arial, Helvetica, sans-serif; padding:20px; color:#111; }
            h2{ text-align:center; margin-bottom:6px; }
            .meta { display:flex; justify-content:space-between; margin-bottom:10px; }
            table{ width:100%; border-collapse:collapse; margin-bottom:12px; }
            th, td{ border:1px solid #444; padding:6px 8px; font-size:12px; text-align:left; }
            th{ background:#eee; text-align:center; }
            .num { text-align:right; }
            tfoot td { font-weight:700; }
            .right { text-align:right; }
            .small { font-size:11px; color:#444; }
          </style>
        </head>
        <body>
          <h2>PACIFIC LEATHER COMPANY</h2>
          <div class="meta">
            <div>
              <div><strong>Bill Date:</strong> ${new Date().toLocaleDateString()}</div>
              <div class="small">Sales Invoice mode: ${salesInvoice ? 'ON' : 'OFF'}</div>
            </div>
            <div style="text-align:right;">
              <div><strong>GST %</strong>: ${gstPct}%</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>PLC Date</th><th>PLC GP#</th><th>P.G Date</th><th>P.G#</th><th>ARTICLE</th>
                <th>PC's</th><th>SQ.FT</th><th>RATE</th><th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
    `;
    rows.forEach(r=>{
      html += `<tr>
        <td>${r.plcDate || ''}</td>
        <td>${escapeHtml(r.plcGp)}</td>
        <td>${r.pgDate || ''}</td>
        <td>${escapeHtml(r.pgNo)}</td>
        <td>${escapeHtml(r.article)}</td>
        <td class="num">${fmt(r.pcs,0)}</td>
        <td class="num">${fmt(r.sqft,2)}</td>
        <td class="num">${fmt(r.rate,2)}</td>
        <td class="num">${fmt(r.amount,2)}</td>
      </tr>`;
    });

    html += `
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="right">SUBTOTAL</td>
                <td class="num">${fmt(rows.reduce((s,x)=>s+x.pcs,0),0)}</td>
                <td class="num">${fmt(rows.reduce((s,x)=>s+x.sqft,0),2)}</td>
                <td></td>
                <td class="num">${fmt(subtotal,2)}</td>
              </tr>
              <tr>
                <td colspan="8" class="right">GST ${gstPct}%</td>
                <td class="num">${fmt(gstAmt,2)}</td>
              </tr>
              <tr>
                <td colspan="8" class="right">GRAND TOTAL</td>
                <td class="num">${fmt(grand,2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top:20px;">
            <div style="display:flex; gap:40px;">
              <div><strong>Prepared By:</strong> ____________________</div>
              <div><strong>Approved By:</strong> ____________________</div>
              <div><strong>Received By:</strong> ____________________</div>
            </div>
          </div>

        </body>
      </html>
    `;

    // open print window
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Wait briefly for content to render then print
    setTimeout(()=> {
      w.focus();
      w.print();
    }, 300);
  });

  // small helper to escape HTML for safety in print output
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

//   // Seed with a few sample rows to show layout (optional)
//   addRow({plcDate:'2025-09-19', plcGp:'13/01', pgDate:'', pgNo:'', article:'GOAT CRUST TO COGNIC W/P', pcs:1700, sqft:9789.5, rate:95});
//   addRow({plcDate:'2025-09-13', plcGp:'05/01', pgDate:'2025-09-09', pgNo:'46', article:'SHEEP YELLOW DYED TO FINISH', pcs:1250, sqft:6938.25, rate:27});
//   addRow({plcDate:'2025-09-15', plcGp:'06/01', pgDate:'2025-09-09', pgNo:'46', article:'SHEEP YELLOW DYED TO FINISH', pcs:1250, sqft:6302.75, rate:27});
//   // ensure listeners updated & totals correct
recalcAll();

})();