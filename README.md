# billing-system

1) HTML structure — what’s where

<head>

Page meta & embedded <style> hold the UI / print styles.

Page title and top heading:

<h1>PACIFIC LEATHER COMPANY — Billing System</h1>

Controls area (.controls.no-print) — top action bar (not printed):

Add Row, Clear Rows buttons for the main bill table.

GST % input.

Select Company dropdown (to choose which company will appear on printed documents).

Print Bill and Print Sales Tax Invoice buttons.

Bill section (#billSection)

Company name placeholder: <h1 id="companyName"> — updated before printing.

Main items table (#itemsTable) with #itemsBody for dynamic rows.

Totals in table footer and summary inputs (#subtotal, #gstAmount, #grandTotal).

Signature lines.

Sales Tax Invoice section (#salesInvoiceSection)

Company name placeholder for invoice: <h1 id="companyNameInvoice">.

Supplier controls (a supplier select with data attributes) plus supplier display fields (#supplierName, #supplierAddress, etc.)

Buyer fields (editable).

Sales tax table (#salesTaxTable) with body #salesTaxBody — starts with 1 row by default.

Buttons (inside supplier/buyer area, no-print) to Add Invoice Row and Clear Rows.


2) CSS — what’s important

General layout, typography, colors for neat, readable UI.

@media print block:

Makes only the currently selected print area visible (via .print-area) and hides UI controls (.no-print).

Ensures printed tables show black borders and buttons are hidden.

Visual niceties: shadow, rounded corners, input focus background.


Totals and amount-in-words (#grandTotalTax, #amountInWords).
3) JavaScript — behavior explained line by line (high level and then functions)
A — Billing system variables & setup
const itemsBody = document.getElementById("itemsBody");
const addRowBtn = document.getElementById("addRowBtn");
const clearBtn = document.getElementById("clearBtn");
const gstInput = document.getElementById("gstInput");
const gstLabel = document.getElementById("gstPercentLabel");


Grabs DOM elements used by the billing functions.

B — addRow() — add a new line to bill table
function addRow() { ... }


Creates a <tr> with inputs for PLC Date, PLC GP#, P.G Date, P.G#, Article, PC's, SQ.FT, RATE and a read-only AMOUNT.

Appends the row to itemsBody.

Calls attachRowListeners(row) to wire up auto-calculation and remove button behavior.

How to use:

Click Add Row to add a new billing line.

C — attachRowListeners(row) — wired per-row listeners
function attachRowListeners(row) { ... }


Finds .pcs, .sqft, .rate, .amount, and the remove button in the row.

recalc() computes amount = sqft * rate and writes to the .amount input.

Adds input listeners on sqft and rate so amount updates live as you type.

Adds click handler to Remove button — removes the row and updates totals.

Note: pcs isn't used directly for amount calculation; it's included for counts/summary.

D — updateTotals() — recalculates all bill totals
function updateTotals() { ... }


Iterates every row in itemsBody, summing:

total pieces (totalPcs from .pcs)

total sqft (totalSqft from .sqft)

total amounts (totalAmt from .amount)

Writes computed totals into:

footer placeholders: #totalPcs, #totalSqft, #totalAmount

summary inputs: #subtotal, #gstAmount, #grandTotal

GST is computed from subtotal * gst%.

Called automatically when row inputs change or rows are added/removed.

E — Billing buttons wiring
addRowBtn.addEventListener("click", addRow);
clearBtn.addEventListener("click", () => {...});
gstInput.addEventListener("input", () => {...});


Add Row adds a billing line.

Clear Rows empties the billing table (and triggers totals update).

Changing GST % updates totals live.

F — Supplier auto-fill (sales invoice)
const supplierSelect = document.getElementById("supplierSelect");
...
supplierSelect.addEventListener("change", () => {
  const selected = supplierSelect.options[supplierSelect.selectedIndex];
  supplierName.textContent = selected.textContent;
  supplierAddress.textContent = selected.dataset.address;
  supplierNTN.textContent = selected.dataset.ntn;
  supplierSTRN.textContent = selected.dataset.strn;
});


The <select id="supplierSelect"> has <option> tags with data-address, data-ntn, data-strn.

When the user picks a supplier option, the supplier display fields are updated.

Important: populate data- attributes in the HTML option tags with accurate values (address/NTN/STRN). Example:

<option value="pacific" data-address="Plot No.85..." data-ntn="1234" data-strn="5678">Pacific Leather Company</option>


The selector is marked class="no-print", so it hides when printing — only the chosen supplier fields (plain text) show.

G — Sales Tax Invoice calculation (updateSalesTaxTotals)
function updateSalesTaxTotals() { ... }


Iterates all rows (each <tr>) in salesTaxBody.

For each row:

reads qty, unitPrice, rateTax, furtherTax

computes:

valueGoods = qty * unitPrice

amountTax = valueGoods * (rateTax/100)

totalRow = valueGoods + amountTax + furtherTax

writes valueGoods, amountTax, totalRow into the row inputs (read-only)

accumulates total

After loop:

sets #grandTotalTax to total

converts to words using numberToWords() and writes #amountInWords.

This function is called whenever inputs inside salesTaxBody change (thanks to delegated listener).

H — Add / Clear rows for Sales Tax Invoice
const addSalesRowBtn = document.getElementById("addSalesRowBtn");
const clearSalesRowBtn = document.getElementById("clearSalesRowBtn");
addSalesRowBtn.addEventListener("click", addSalesTaxRow);
clearSalesRowBtn.addEventListener("click", () => { salesTaxBody.innerHTML = ""; updateSalesTaxTotals(); });


addSalesTaxRow() creates and appends a new table row for the invoice table (same columns as initial row).

Because the input salesTaxBody.addEventListener("input", ...) is attached to the parent, newly appended rows are handled automatically for live calculation.

Clear Rows empties the sales tax rows.

If you want row removal buttons for invoice rows too, we can add a Remove button per row (I can provide that if you want).

I — numberToWords(num) — numeric to English words

Converts integers to words up to crores/lakhs using simple recursion and arrays for 0–19 and tens.

Used to display amount-in-words for the invoice grand total.

J — Print buttons & company selection
const companySelect = document.getElementById("companySelect");
const companyNameBill = document.getElementById("companyName");
const companyNameInvoice = document.getElementById("companyNameInvoice");

function getCompanyName() { ... }

document.getElementById("printBillBtn").addEventListener("click", () => {
  companyNameBill.textContent = getCompanyName();
  billSection.classList.add("print-area");
  invoiceSection.classList.remove("print-area");
  window.print();
});
document.getElementById("printInvoiceBtn").addEventListener("click", () => {
  companyNameInvoice.textContent = getCompanyName();
  invoiceSection.classList.add("print-area");
  billSection.classList.remove("print-area");
  window.print();
});


companySelect chooses which company name to use on printed documents. getCompanyName() maps the selection to a display string.

When you click Print Bill, it:

sets the <h1 id="companyName"> in the bill section to the selected company name,

marks bill section visible for print (adds class .print-area),

hides invoice print area,

calls window.print() to open the print dialog.

Similarly for Print Sales Tax Invoice: sets invoice section company name and prints only that area.

Important: .print-area + @media print CSS makes only the chosen section visible in the printed output.

4) How to use the page (practical steps)

Select company in the top dropdown (affects printed company header).

For the Bill:

Click Add Row to add lines.

Fill SQ.FT and RATE — AMOUNT auto-calculates.

Add more rows; totals update automatically.

Change GST % to adjust totals.

Click Print Bill — print dialog appears with only the bill showing (company header set).

For the Sales Tax Invoice:

Choose supplier from the Select Supplier dropdown (populates supplier details).

Enter buyer details.

Click Add Invoice Row to add more rows (or use the one initial row).

In each invoice row, add Quantity and Unit Price (tax rate and further tax can be changed).

Values, tax, totals and amount-in-words update as you type.

Click Print Sales Tax Invoice — print dialog with only the invoice section.
