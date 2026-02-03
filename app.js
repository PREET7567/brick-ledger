// Data structure in localStorage:
// customers: [{id, name, mobile}]
// transactions: [{id, customerId, date, item, qty, rate, discount, paid}]

const STORAGE_KEYS = {
  customers: 'brick_ledger_customers',
  transactions: 'brick_ledger_transactions'
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

// DOM elements
const custName = document.getElementById('custName');
const custMobile = document.getElementById('custMobile');
const addCustomerBtn = document.getElementById('addCustomerBtn');
const customerSearch = document.getElementById('customerSearch');
const customerSelect = document.getElementById('customerSelect');

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

const reportMonth = document.getElementById('reportMonth');
const loadReportBtn = document.getElementById('loadReportBtn');
const reportTitle = document.getElementById('reportTitle');
const ledgerTableBody = document.querySelector('#ledgerTable tbody');
const openingBalanceEl = document.getElementById('openingBalance');
const monthPurchaseEl = document.getElementById('monthPurchase');
const monthPaidEl = document.getElementById('monthPaid');
const monthDiscountEl = document.getElementById('monthDiscount');
const closingBalanceEl = document.getElementById('closingBalance');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

function generateId() {
  return Date.now().toString() + '_' + Math.random().toString(16).slice(2);
}

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
}

addCustomerBtn.addEventListener('click', () => {
  const name = custName.value.trim();
  const mobile = custMobile.value.trim();
  if (!name || !mobile) {
    alert('Please enter both name and mobile.');
    return;
  }

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

customerSearch.addEventListener('input', () => {
  renderCustomerOptions(customerSearch.value);
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

// ----- Save transaction -----
addTransactionBtn.addEventListener('click', () => {
  const customerId = customerSelect.value;
  if (!customerId) {
    alert('Please select a customer.');
    return;
  }
  const date = trxDate.value;
  if (!date) {
    alert('Please enter date.');
    return;
  }
  const item = trxItem.value.trim() || 'Bricks';
  const qty = parseFloat(trxQty.value) || 0;
  const rate = parseFloat(trxRate.value) || 0;
  const discount = parseFloat(trxDiscount.value) || 0;
  const paid = parseFloat(trxPaid.value) || 0;

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
  saveData(STORAGE_KEYS.transactions, transactions);
  alert('Transaction saved.');

  // clear quantity-based fields
  trxItem.value = '';
  trxQty.value = '';
  trxRate.value = '';
  trxDiscount.value = '0';
  trxPaid.value = '0';
  trxTotal.value = '';
  trxNet.value = '';
  trxBalanceChange.value = '';
});

// ----- Reporting -----
function getCustomerById(id) {
  return customers.find(c => c.id === id);
}

function loadReport() {
  const customerId = customerSelect.value;
  const monthValue = reportMonth.value; // format: YYYY-MM
  if (!customerId) {
    alert('Please select a customer.');
    return;
  }
  if (!monthValue) {
    alert('Please select month.');
    return;
  }

  const customer = getCustomerById(customerId);
  reportTitle.textContent = `Ledger for ${customer.name} (${customer.mobile}) - ${monthValue}`;

  const [yearStr, monthStr] = monthValue.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const custTrx = transactions
    .filter(t => t.customerId === customerId)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Opening balance = all net - paid before this month
  let openingBalance = 0;
  custTrx.forEach(t => {
    const d = new Date(t.date);
    const tYear = d.getFullYear();
    const tMonth = d.getMonth() + 1;
    const total = t.qty * t.rate;
    const net = total - t.discount;
    if (tYear < year || (tYear === year && tMonth < month)) {
      openingBalance += net - t.paid;
    }
  });

  // Table rows for selected month
  ledgerTableBody.innerHTML = '';
  let runningBalance = openingBalance;
  let monthPurchase = 0;
  let monthPaid = 0;
  let monthDiscount = 0;

  custTrx.forEach(t => {
    const d = new Date(t.date);
    const tYear = d.getFullYear();
    const tMonth = d.getMonth() + 1;
    if (tYear === year && tMonth === month) {
      const total = t.qty * t.rate;
      const net = total - t.discount;
      runningBalance += net - t.paid;
      monthPurchase += net;
      monthPaid += t.paid;
      monthDiscount += t.discount;

      const tr = document.createElement('tr');
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
      `;
      ledgerTableBody.appendChild(tr);
    }
  });

  openingBalanceEl.textContent = openingBalance.toFixed(2);
  monthPurchaseEl.textContent = monthPurchase.toFixed(2);
  monthPaidEl.textContent = monthPaid.toFixed(2);
  monthDiscountEl.textContent = monthDiscount.toFixed(2);
  closingBalanceEl.textContent = runningBalance.toFixed(2);
}

loadReportBtn.addEventListener('click', loadReport);

// ----- Export functions (simple) -----
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

// ----- Init -----
window.addEventListener('load', () => {
  renderCustomerOptions();
  // default month = current month
  const now = new Date();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  reportMonth.value = `${now.getFullYear()}-${m}`;
});

