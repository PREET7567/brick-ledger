// Data structure in localStorage:
// customers: [{id, name, mobile}]
// transactions: [{id, customerId, date, item, qty, rate, discount, paid}]

const STORAGE_KEYS = {
  customers: 'brick_ledger_customers',
  transactions: 'brick_ledger_transactions',
  theme: 'brick_ledger_theme'
};

function loadData(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let customers = loadData(STORAGE_KEYS.customers);
let transactions = loadData(STORAGE_KEYS.transactions);
let editingTransactionId = null;

// DOM elements
const custName = document.getElementById('custName');
const custMobile = document.getElementById('custMobile');
const addCustomerBtn = document.getElementById('addCustomerBtn');
const deleteCustomerBtn = document.getElementById('deleteCustomerBtn');
const customerSearch = document.getElementById('customerSearch');
const customerSelect = document.getElementById('customerSelect');
const currentCustomerLabel = document.getElementById('currentCustomerLabel');
const currentCustomerInline = document.getElementById('currentCustomerInline');

const trxDate = document.getElementById('trxDate');
const trxItem = document.getElementById('trxItem');
const trxQty = document.getElementById('trxQty');
const trxRate = document.getElementById('trxRate');
const trxDiscount = document.getElementById('trxDiscount');
const trxPaid = document.getElementById('trxPaid');
const trxTotal = document.getElementById('trxTotal');
const trxNet = document.getElementById('trxNet');
const trxBalanceChange = document.getElementById('trxBalanceChange');
const addTransactionBtn = document.getElementById('addTransactionBtn');

const filterType = document.getElementById('filterType');
const monthFilterRow = document.getElementById('monthFilterRow');
const dayFilterRow = document.getElementById('dayFilterRow');
const yearFilterRow = document.getElementById('yearFilterRow');
const reportMonth = document.getElementById('reportMonth');
const reportDay = document.getElementById('reportDay');
const reportYear = document.getElementById('reportYear');

const loadReportBtn = document.getElementById('loadReportBtn');
const reportTitle = document.getElementById('reportTitle');
const ledgerTableBody = document.querySelector('#ledgerTable tbody');
const openingBalanceEl = document.getElementById('openingBalance');
const monthPurchaseEl = document.getElementById('monthPurchase');
const monthPaidEl = document.getElementById('monthPaid');
const monthDiscountEl = document.getElementById('monthDiscount');
const closingBalanceEl = document.getElementById('closingBalance');
const lifetimePaidEl = document.getElementById('lifetimePaid');
const lifetimeClosingEl = document.getElementById('lifetimeClosing');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

const summaryTableBody = document.querySelector('#summaryTable tbody');
const themeToggleBtn = document.getElementById('themeToggleBtn');

function generateId() {
  return Date.now().toString() + '_' + Math.random().toString(16).slice(2);
}

// ----- Theme handling -----
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
    themeToggleBtn.textContent = '☀ Light';
  } else {
    document.body.classList.remove('theme-dark');
    themeToggleBtn.textContent = '🌙 Dark';
  }
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  applyTheme(saved);
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('theme-dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem(STORAGE_KEYS.theme, newTheme);
});

// ----- Customer handling -----
function renderCustomerOptions(filterText = '') {
  const text = filterText.toLowerCase();
  customerSelect.innerHTML = '';
  customers
    .filter(c =>
      c.name.toLowerCase().includes(text) ||
      c.mobile.toLowerCase().includes(text)
    )
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.mobile})`;
      customerSelect.appendChild(opt);
    });

  updateCurrentCustomerLabels();
}

function updateCurrentCustomerLabels() {
  if (!customerSelect.value || customerSelect.selectedIndex === -1) {
    currentCustomerLabel.innerHTML = '<strong>Current Customer:</strong> None selected';
    currentCustomerInline.innerHTML = '<strong>For:</strong> None selected';
    reportTitle.textContent = '';
    ledgerTableBody.innerHTML = '';
    openingBalanceEl.textContent = '0';
    monthPurchaseEl.textContent = '0';
    monthPaidEl.textContent = '0';
    monthDiscountEl.textContent = '0';
    closingBalanceEl.textContent = '0';
    lifetimePaidEl.textContent = '0';
    lifetimeClosingEl.textContent = '0';
    summaryTableBody.innerHTML = '';
    return;
  }
  const text = customerSelect.options[customerSelect.selectedIndex].text;
  currentCustomerLabel.innerHTML = '<strong>Current Customer:</strong> ' + text;
  currentCustomerInline.innerHTML = '<strong>For:</strong> ' + text;
}

// small helper to mark required empty inputs
function markRequired(inputs) {
  let valid = true;
  inputs.forEach(el => {
    if (!el.value || el.value.trim() === '') {
      el.classList.add('input-error');
      valid = false;
    } else {
      el.classList.remove('input-error');
    }
  });
  return valid;
}

addCustomerBtn.addEventListener('click', () => {
  const ok = markRequired([custName, custMobile]);
  if (!ok) {
    alert('Please fill required fields.');
    return;
  }

  const name = custName.value.trim();
  const mobile = custMobile.value.trim();

  let existing = customers.find(
    c => c.mobile === mobile || c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    existing.name = name;
    existing.mobile = mobile;
  } else {
    existing = { id: generateId(), name, mobile };
    customers.push(existing);
  }
  saveData(STORAGE_KEYS.customers, customers);
  renderCustomerOptions(customerSearch.value);
  alert('Customer saved.');
});

// Delete customer and all their transactions
deleteCustomerBtn.addEventListener('click', () => {
  const customerId = customerSelect.value;
  if (!customerId) {
    alert('Select a customer to delete.');
    return;
  }
  const cust = customers.find(c => c.id === customerId);
  const nameText = cust ? `${cust.name} (${cust.mobile})` : 'this customer';
  if (!confirm(`Delete ${nameText} and ALL their transactions?`)) return;

  customers = customers.filter(c => c.id !== customerId);
  transactions = transactions.filter(t => t.customerId !== customerId);

  saveData(STORAGE_KEYS.customers, customers);
  saveData(STORAGE_KEYS.transactions, transactions);

  customerSelect.value = '';
  renderCustomerOptions(customerSearch.value);
  alert('Customer and related transactions deleted.');
});

customerSearch.addEventListener('input', () => {
  renderCustomerOptions(customerSearch.value);
  // After filtering, if there is a selected option, show its ledger
  loadReportSilently();
});

customerSelect.addEventListener('change', () => {
  updateCurrentCustomerLabels();
  loadReportSilently();
});

// ----- Transaction calculations -----
function updateTransactionPreview() {
  const qty = parseFloat(trxQty.value) || 0;
  const rate = parseFloat(trxRate.value) || 0;
  const discount = parseFloat(trxDiscount.value) || 0;
  const paid = parseFloat(trxPaid.value) || 0;

  const total = qty * rate;
  const net = total - discount;
  const balanceChange = net - paid;

  trxTotal.value = total.toFixed(2);
  trxNet.value = net.toFixed(2);
  trxBalanceChange.value = balanceChange.toFixed(2);
}

[trxQty, trxRate, trxDiscount, trxPaid].forEach(el => {
  el.addEventListener('input', updateTransactionPreview);
});

// ----- Insert / Update transaction -----
addTransactionBtn.addEventListener('click', () => {
  const customerId = customerSelect.value;
  if (!customerId) {
    alert('Please select a customer first.');
    return;
  }
  const ok = markRequired([trxDate]);
  if (!ok) {
    alert('Please select a date.');
    return;
  }

  const date = trxDate.value;
  const item = trxItem.value.trim() || 'Bricks';
  const qty = parseFloat(trxQty.value) || 0;
  const rate = parseFloat(trxRate.value) || 0;
  const discount = parseFloat(trxDiscount.value) || 0;
  const paid = parseFloat(trxPaid.value) || 0;

  if (editingTransactionId) {
    const idx = transactions.findIndex(t => t.id === editingTransactionId);
    if (idx !== -1) {
      transactions[idx].date = date;
      transactions[idx].item = item;
      transactions[idx].qty = qty;
      transactions[idx].rate = rate;
      transactions[idx].discount = discount;
      transactions[idx].paid = paid;
    }
    editingTransactionId = null;
    addTransactionBtn.textContent = 'Save Transaction';
    alert('Transaction updated.');
  } else {
    const trx = {
      id: generateId(),
      customerId,
      date,
      item,
      qty,
      rate,
      discount,
      paid
    };
    transactions.push(trx);
    alert('Transaction saved for selected customer.');
  }

  saveData(STORAGE_KEYS.transactions, transactions);

  trxItem.value = '';
  trxQty.value = '';
  trxRate.value = '';
  trxDiscount.value = '0';
  trxPaid.value = '0';
  trxTotal.value = '';
  trxNet.value = '';
  trxBalanceChange.value = '';

  loadReportSilently();
});

// ----- Edit / Delete helpers -----
function startEditTransaction(id) {
  const trx = transactions.find(t => t.id === id);
  if (!trx) return;

  customerSelect.value = trx.customerId;
  updateCurrentCustomerLabels();

  trxDate.value = trx.date;
  trxItem.value = trx.item;
  trxQty.value = trx.qty;
  trxRate.value = trx.rate;
  trxDiscount.value = trx.discount;
  trxPaid.value = trx.paid;
  updateTransactionPreview();

  editingTransactionId = id;
  addTransactionBtn.textContent = 'Update Transaction';
}

function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  transactions = transactions.filter(t => t.id !== id);
  saveData(STORAGE_KEYS.transactions, transactions);
  loadReportSilently();
}

function openCustomerLedger(customerId) {
  customerSelect.value = customerId;
  updateCurrentCustomerLabels();
  loadReport();
}

// ----- Filter type toggle -----
filterType.addEventListener('change', () => {
  const type = filterType.value;
  monthFilterRow.style.display = type === 'month' ? 'flex' : 'none';
  dayFilterRow.style.display = type === 'day' ? 'flex' : 'none';
  yearFilterRow.style.display = type === 'year' ? 'flex' : 'none';
});

// ----- Reporting -----
function getCustomerById(id) {
  return customers.find(c => c.id === id);
}

function loadReportSilently() {
  const customerId = customerSelect.value;
  if (!customerId) return;
  if (filterType.value === 'month' && !reportMonth.value) return;
  if (filterType.value === 'day' && !reportDay.value) return;
  if (filterType.value === 'year' && !reportYear.value) return;
  loadReport();
}

function loadReport() {
  const customerId = customerSelect.value;
  const type = filterType.value;

  if (!customerId) {
    return; // if none, labels already cleared in updateCurrentCustomerLabels
  }

  let year, month, day;
  let titleSuffix = '';

  if (type === 'month') {
    const monthValue = reportMonth.value;
    if (!monthValue) return;
    const [yearStr, monthStr] = monthValue.split('-');
    year = parseInt(yearStr, 10);
    month = parseInt(monthStr, 10);
    titleSuffix = monthValue;
  } else if (type === 'day') {
    const dayValue = reportDay.value;
    if (!dayValue) return;
    const d = new Date(dayValue);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
    titleSuffix = dayValue;
  } else if (type === 'year') {
    const yearValue = parseInt(reportYear.value, 10);
    if (!yearValue) return;
    year = yearValue;
    titleSuffix = year.toString();
  }

  const customer = getCustomerById(customerId);
  if (!customer) return;

  reportTitle.textContent = `Ledger for ${customer.name} (${customer.mobile}) - ${type.toUpperCase()} ${titleSuffix}`;

  const allTrxSorted = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const custTrx = allTrxSorted.filter(t => t.customerId === customerId);

  let openingBalance = 0;

  custTrx.forEach(t => {
    const d = new Date(t.date);
    const tYear = d.getFullYear();
    const tMonth = d.getMonth() + 1;
    const tDay = d.getDate();
    const total = t.qty * t.rate;
    const net = total - t.discount;

    let inPast = false;

    if (type === 'month') {
      inPast = (tYear < year) || (tYear === year && tMonth < month);
    } else if (type === 'day') {
      const trxTime = d.getTime();
      const selectedTime = new Date(year, month - 1, day).getTime();
      inPast = trxTime < selectedTime;
    } else if (type === 'year') {
      inPast = tYear < year;
    }

    if (inPast) {
      openingBalance += net - t.paid;
    }
  });

  ledgerTableBody.innerHTML = '';
  let runningBalance = openingBalance;
  let periodNet = 0;
  let periodPaid = 0;
  let periodDiscount = 0;

  custTrx.forEach(t => {
    const d = new Date(t.date);
    const tYear = d.getFullYear();
    const tMonth = d.getMonth() + 1;
    const tDay = d.getDate();
    const total = t.qty * t.rate;
    const net = total - t.discount;

    let inRange = false;

    if (type === 'month') {
      inRange = (tYear === year && tMonth === month);
    } else if (type === 'day') {
      inRange = (tYear === year && tMonth === month && tDay === day);
    } else if (type === 'year') {
      inRange = (tYear === year);
    }

    if (inRange) {
      runningBalance += net - t.paid;
      periodNet += net;
      periodPaid += t.paid;
      periodDiscount += t.discount;

      const tr = document.createElement('tr');
      tr.setAttribute('data-id', t.id);
      tr.innerHTML = `
        <td>${t.date}</td>
        <td>${t.item}</td>
        <td>${t.qty}</td>
        <td>${t.rate.toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
        <td>${t.discount.toFixed(2)}</td>
        <td>${net.toFixed(2)}</td>
        <td>${t.paid.toFixed(2)}</td>
        <td>${runningBalance.toFixed(2)}</td>
        <td>
          <button type="button" onclick="startEditTransaction('${t.id}')">✏ Edit</button>
          <button type="button" onclick="deleteTransaction('${t.id}')">🗑 Delete</button>
        </td>
      `;
      ledgerTableBody.appendChild(tr);
    }
  });

  openingBalanceEl.textContent = openingBalance.toFixed(2);
  monthPurchaseEl.textContent = periodNet.toFixed(2);
  monthPaidEl.textContent = periodPaid.toFixed(2);
  monthDiscountEl.textContent = periodDiscount.toFixed(2);
  closingBalanceEl.textContent = runningBalance.toFixed(2);

  // Lifetime totals
  let lifetimePaid = 0;
  let lifetimeNet = 0;
  custTrx.forEach(t => {
    const total = t.qty * t.rate;
    const net = total - t.discount;
    lifetimePaid += t.paid;
    lifetimeNet += net;
  });
  const lifetimeClosing = lifetimeNet - lifetimePaid;
  lifetimePaidEl.textContent = lifetimePaid.toFixed(2);
  lifetimeClosingEl.textContent = lifetimeClosing.toFixed(2);

  // Summary for all customers
  summaryTableBody.innerHTML = '';

  customers.forEach(cust => {
    const custTrxAll = allTrxSorted.filter(t => t.customerId === cust.id);

    let opening = 0;
    let pNet = 0;
    let pPaid = 0;
    let pDisc = 0;
    let closing = 0;

    custTrxAll.forEach(t => {
      const d = new Date(t.date);
      const tYear = d.getFullYear();
      const tMonth = d.getMonth() + 1;
      const tDay = d.getDate();
      const total = t.qty * t.rate;
      const net = total - t.discount;

      let inPast = false;
      let inRange2 = false;

      if (type === 'month') {
        inPast = (tYear < year) || (tYear === year && tMonth < month);
        inRange2 = (tYear === year && tMonth === month);
      } else if (type === 'day') {
        const trxTime = d.getTime();
        const selectedTime = new Date(year, month - 1, day).getTime();
        inPast = trxTime < selectedTime;
        inRange2 = (tYear === year && tMonth === month && tDay === day);
      } else if (type === 'year') {
        inPast = tYear < year;
        inRange2 = (tYear === year);
      }

      if (inPast) {
        opening += net - t.paid;
      }
      if (inRange2) {
        pNet += net;
        pPaid += t.paid;
        pDisc += t.discount;
      }
    });

    closing = opening + (pNet - pPaid);

    if (opening !== 0 || pNet !== 0 || pPaid !== 0 || closing !== 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <button type="button"
                  onclick="openCustomerLedger('${cust.id}')">
            ${cust.name} (${cust.mobile})
          </button>
        </td>
        <td>${pNet.toFixed(2)}</td>
        <td>${pPaid.toFixed(2)}</td>
        <td>${pDisc.toFixed(2)}</td>
        <td>${closing.toFixed(2)}</td>
      `;
      summaryTableBody.appendChild(tr);
    }
  });
}

// Export
function tableToExcel(tableId, filename) {
  const table = document.getElementById(tableId);
  const html = table.outerHTML;
  const uri = 'data:application/vnd.ms-excel;base64,';
  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head>
    <body>${html}</body></html>`;
  const base64 = s => window.btoa(unescape(encodeURIComponent(s)));
  const link = document.createElement('a');
  link.href = uri + base64(template);
  link.download = filename || 'ledger.xls';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function tableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  let csv = [];
  for (let i = 0; i < table.rows.length; i++) {
    const row = [];
    for (let j = 0; j < table.rows[i].cells.length; j++) {
      let text = table.rows[i].cells[j].innerText.replace(/"/g, '""');
      row.push('"' + text + '"');
    }
    csv.push(row.join(','));
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename || 'ledger.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

exportExcelBtn.addEventListener('click', () => {
  tableToExcel('ledgerTable', 'ledger.xls');
});

exportCsvBtn.addEventListener('click', () => {
  tableToCSV('ledgerTable', 'ledger.csv');
});

// Init
window.addEventListener('load', () => {
  initTheme();
  renderCustomerOptions();
  const now = new Date();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  reportMonth.value = `${now.getFullYear()}-${m}`;
  reportYear.value = now.getFullYear();
  // auto-load if there is some customer selected
  loadReportSilently();
});
