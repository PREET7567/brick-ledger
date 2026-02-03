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
const loadCustomerBtn = document.getElementById('loadCustomerBtn');
const customerSearch = document.getElementById('customerSearch');
const customerSelect = document.getElementById('customerSelect');
const currentCustomerLabel = document.getElementById('currentCustomerLabel');
const currentCustomerInline = document.getElementById('currentCustomerInline');

const trxType = document.getElementById('trxType');
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

// Theme
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

// Customer handling
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
  const selectedId = customerSelect.value;

  let target = null;

  if (selectedId) {
    target = customers.find(c => c.id === selectedId);
  }
  if (!target) {
    target = customers.find(
      c => c.mobile === mobile || c.name.toLowerCase() === name.toLowerCase()
    );
  }

  if (target) {
    target.name = name;
    target.mobile = mobile;
  } else {
    target = { id: generateId(), name, mobile };
    customers.push(target);
  }

  saveData(STORAGE_KEYS.customers, customers);
  renderCustomerOptions(customerSearch.value);

  if (target && target.id) {
    customerSelect.value = target.id;
    updateCurrentCustomerLabels();
    loadReportSilently();
  }

  alert('Customer saved / updated.');
});

// Load selected customer into form
loadCustomerBtn.addEventListener('click', () => {
  const customerId = customerSelect.value;
  if (!customerId) {
    alert('Select a customer to load.');
    return;
  }
  const cust = customers.find(c => c.id === customerId);
  if (!cust) {
    alert('Customer not found.');
    return;
  }

  custName.value = cust.name;
  custMobile.value = cust.mobile;
  custName.classList.remove('input-error');
  custMobile.classList.remove('input-error');

  alert('Customer data loaded. Edit and click "Add / Update Customer" to save changes.');
});

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
  loadReportSilently();
});

customerSelect.addEventListener('change', () => {
  updateCurrentCustomerLabels();
  loadReportSilently();
});

// Transaction calculations with type
function updateTransactionPreview() {
  const type = trxType.value;
  const qty = parseFloat(trxQty.value) || 0;
  const rate = parseFloat(trxRate.value) || 0;
  let discount = parseFloat(trxDiscount.value) || 0;
  let paid = parseFloat(trxPaid.value) || 0;

  let total = 0;
  let net = 0;

  if (type === 'purchase') {
    total = qty * rate;
    net = total - discount;
  } else if (type === 'money') {
    total = 0;
    discount = 0;
    net = 0;
  } else if (type === 'discount') {
    total = 0;
    paid = 0;
    net = -discount;
  }

  let balanceChange = 0;
  if (type === 'purchase') {
    balanceChange = net - paid;
  } else if (type === 'money') {
    balanceChange = -paid;
  } else if (type === 'discount') {
    balanceChange = net;
  }

  trxTotal.value = total.toFixed(2);
  trxNet.value = net.toFixed(2);
  trxBalanceChange.value = balanceChange.toFixed(2);
}

trxType.addEventListener('change', updateTransactionPreview);
[trxQty, trxRate, trxDiscount, trxPaid].forEach(el => {
  el.addEventListener('input', updateTransactionPreview);
});

// Insert / Update transaction
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

  const type = trxType.value;
  const date = trxDate.value;
  const item = trxItem.value.trim() || (type === 'purchase' ? 'Bricks' : type === 'money' ? 'Money Credit' : 'Discount Credit');
  const qty = parseFloat(trxQty.value) || 0;
  const rate = parseFloat(trxRate.value) || 0;
  const discount = parseFloat(trxDiscount.value) || 0;
  const paid = parseFloat(trxPaid.value) || 0;

  if (editingTransactionId) {
    const idx = transactions.findIndex(t => t.id === editingTransactionId);
    if (idx !== -1) {
      transactions[idx].type = type;
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
      type,
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

  trxType.value = 'purchase';
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

// Edit / Delete transaction
function startEditTransaction(id) {
  const trx = transactions.find(t => t.id === id);
  if (!trx) return;

  customerSelect.value = trx.customerId;
  updateCurrentCustomerLabels();

  trxType.value = trx.type || 'purchase';
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

// Filters
filterType.addEventListener('change', () => {
  const type = filterType.value;
  monthFilterRow.style.display = type === 'month' ? 'flex' : 'none';
  dayFilterRow.style.display = type === 'day' ? 'flex' : 'none';
  yearFilterRow.style.display = type === 'year' ? 'flex' : 'none';
});

// Reporting helpers
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

function computeNetAndTotal(t) {
  let total = 0;
  let net = 0;
  const tType = t.type || 'purchase';
  if (tType === 'purchase') {
    total = t.qty * t.rate;
    net = total - t.discount;
  } else if (tType === 'money') {
    total = 0;
    net = 0;
  } else if (tType === 'discount') {
    total = 0;
    net = -t.discount;
  }
  return { total, net, tType };
}

function loadReport() {
  const customerId = customerSelect.value;
  const type = filterType.value;

  if (!customerId) {
    return;
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
    const { total, net, tType } = computeNetAndTotal(t);

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
      if (tType === 'purchase') {
        openingBalance += net - t.paid;
      } else if (tType === 'money') {
        openingBalance -= t.paid;
      } else if (tType === 'discount') {
        openingBalance += net;
      }
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
    const { total, net, tType } = computeNetAndTotal(t);

    let inRange = false;

    if (type === 'month') {
      inRange = (tYear === year && tMonth === month);
    } else if (type === 'day') {
      inRange = (tYear === year && tMonth === month && tDay === day);
    } else if (type === 'year') {
      inRange = (tYear === year);
    }

    if (inRange) {
      if (tType === 'purchase') {
        runningBalance += net - t.paid;
        periodNet += net;
        periodPaid += t.paid;
        periodDiscount += t.discount;
      } else if (tType === 'money') {
        runningBalance -= t.paid;
        periodPaid += t.paid;
      } else if (tType === 'discount') {
        runningBalance += net;
        periodDiscount += t.discount;
      }

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

  let lifetimePaid = 0;
  let lifetimeNet = 0;
  custTrx.forEach(t => {
    const { net, tType } = computeNetAndTotal(t);
    if (tType === 'purchase') {
      lifetimePaid += t.paid;
      lifetimeNet += net;
    } else if (tType === 'money') {
      lifetimePaid += t.paid;
    } else if (tType === 'discount') {
      lifetimeNet += net;
    }
  });
  const lifetimeClosing = lifetimeNet - lifetimePaid;
  lifetimePaidEl.textContent = lifetimePaid.toFixed(2);
  lifetimeClosingEl.textContent = lifetimeClosing.toFixed(2);

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
      const { net, tType } = computeNetAndTotal(t);

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
        if (tType === 'purchase') {
          opening += net - t.paid;
        } else if (tType === 'money') {
          opening -= t.paid;
        } else if (tType === 'discount') {
          opening += net;
        }
      }
      if (inRange2) {
        if (tType === 'purchase') {
          pNet += net;
          pPaid += t.paid;
          pDisc += t.discount;
        } else if (tType === 'money') {
          pPaid += t.paid;
        } else if (tType === 'discount') {
          pDisc += t.discount;
        }
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
  loadReportSilently();
});
