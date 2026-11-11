/* Munnar Trip Budget Tracker — UI controller. */
(function () {
  'use strict';

  const { CATEGORIES, formatINR, getCategory, todayISO, formatDate, uid, escapeHTML, toCSV, downloadFile } = window.Utils;
  const WARN_THRESHOLD = 0.9; // show "almost there" warning at 90% of budget

  const $ = (sel) => document.querySelector(sel);
  const state = window.TripStorage.load();
  const ui = { search: '', filter: '', pendingDeleteId: null, lastFocus: null };

  /* ---------- Derived data ---------- */

  const sortedExpenses = () =>
    [...state.expenses].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));

  const totals = () => {
    const spent = state.expenses.reduce((s, e) => s + e.amount, 0);
    const remaining = state.budget - spent;
    const ratio = state.budget > 0 ? spent / state.budget : 0;
    return { spent, remaining, ratio, count: state.expenses.length };
  };

  const persist = () => {
    if (!window.TripStorage.save(state)) toast('Could not save — browser storage is unavailable.', 'error');
  };

  /* ---------- Rendering ---------- */

  function renderDashboard() {
    const { spent, remaining, ratio, count } = totals();
    const over = state.budget > 0 && spent > state.budget;

    $('#statBudget').textContent = state.budget > 0 ? formatINR(state.budget) : 'Not set';
    $('#statSpent').textContent = formatINR(spent);
    $('#statSpentMeta').textContent = count ? `Avg ${formatINR(spent / count)} per expense` : 'No expenses yet';

    $('#statRemainingLabel').textContent = over ? 'Over budget by' : 'Remaining';
    $('#statRemaining').textContent = formatINR(Math.abs(remaining));
    $('#statRemainingMeta').textContent = state.budget > 0 ? `${Math.max(0, 100 - Math.round(ratio * 100))}% of budget left` : 'Set a budget to track';
    $('#remainingCard').classList.toggle('is-over', over);

    const days = new Set(state.expenses.map((e) => e.date)).size;
    $('#statCount').textContent = count;
    $('#statCountMeta').textContent = count ? `across ${days} day${days === 1 ? '' : 's'}` : 'Add your first one';

    const pct = Math.round(ratio * 100);
    const bar = $('#progressBar');
    $('#progressFill').style.width = `${Math.min(100, ratio * 100)}%`;
    $('#progressPct').textContent = state.budget > 0 ? `${pct}%` : '—';
    bar.setAttribute('aria-valuenow', String(Math.min(100, pct)));
    bar.classList.toggle('is-warn', ratio >= WARN_THRESHOLD && !over);
    bar.classList.toggle('is-over', over);
    $('#progressSpent').textContent = `${formatINR(spent)} spent`;
    $('#progressBudget').textContent = state.budget > 0 ? `of ${formatINR(state.budget)}` : 'No budget set';

    const alert = $('#budgetAlert');
    if (over) {
      alert.className = 'alert alert-danger';
      alert.innerHTML = `<strong>⚠️ Over budget!</strong> You've spent ${formatINR(spent - state.budget)} more than the planned ${formatINR(state.budget)}.`;
      alert.hidden = false;
    } else if (state.budget > 0 && ratio >= WARN_THRESHOLD) {
      alert.className = 'alert alert-warn';
      alert.innerHTML = `<strong>Heads up:</strong> ${pct}% of the budget is used — only ${formatINR(remaining)} left.`;
      alert.hidden = false;
    } else if (state.budget <= 0) {
      alert.className = 'alert alert-info';
      alert.innerHTML = `No trip budget set yet. <button type="button" class="link-btn" data-action="set-budget">Set your budget</button> to track the remaining balance.`;
      alert.hidden = false;
    } else {
      alert.hidden = true;
    }
  }

  function renderCategories() {
    const { spent } = totals();
    $('#categoryGrid').innerHTML = CATEGORIES.map((c) => {
      const items = state.expenses.filter((e) => e.category === c.id);
      const total = items.reduce((s, e) => s + e.amount, 0);
      const share = spent > 0 ? Math.round((total / spent) * 100) : 0;
      return `
        <article class="category-card${total ? '' : ' is-empty'}" style="--cat:${c.color}">
          <div class="category-top">
            <span class="category-icon" aria-hidden="true">${c.icon}</span>
            <span class="category-share">${share}%</span>
          </div>
          <p class="category-name">${c.id}</p>
          <p class="category-amount">${formatINR(total)}</p>
          <div class="mini-bar"><span style="width:${share}%"></span></div>
          <p class="category-count">${items.length} expense${items.length === 1 ? '' : 's'}</p>
        </article>`;
    }).join('');
  }

  function renderChart() {
    const hasData = state.expenses.length > 0;
    $('#chartEmpty').hidden = hasData;
    $('#chartWrap').hidden = !hasData;
    if (!hasData) return;
    if (!window.Charts.render($('#mainChart'), state.expenses)) {
      $('#chartWrap').hidden = true;
      $('#chartEmpty').hidden = false;
      $('#chartEmpty .empty-title').textContent = 'Charts unavailable';
      $('#chartEmpty .empty-text').textContent = 'Chart library could not load (are you offline?).';
    }
  }

  function renderHistory() {
    const q = ui.search.trim().toLowerCase();
    const rows = sortedExpenses().filter(
      (e) => (!ui.filter || e.category === ui.filter) && (!q || e.name.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q))
    );
    const isFiltered = Boolean(q || ui.filter);
    const hasRows = rows.length > 0;

    $('#tableWrap').hidden = !hasRows;
    $('#historyEmpty').hidden = hasRows;
    if (!hasRows) {
      const anyExpenses = state.expenses.length > 0;
      $('#historyEmptyTitle').textContent = anyExpenses ? 'No matching expenses' : 'No expenses added yet';
      $('#historyEmptyText').textContent = anyExpenses ? 'Try a different search or category filter.' : 'Start by adding your first Munnar trip expense above.';
      $('#historyEmptyCta').hidden = anyExpenses;
    }

    $('#expenseRows').innerHTML = rows.map((e) => {
      const c = getCategory(e.category);
      return `
        <tr data-id="${e.id}">
          <td data-label="Expense">
            <span class="row-name">${escapeHTML(e.name)}</span>
            ${e.notes ? `<span class="row-notes">${escapeHTML(e.notes)}</span>` : ''}
          </td>
          <td data-label="Category"><span class="badge" style="--cat:${c.color}">${c.icon} ${c.id}</span></td>
          <td data-label="Date">${formatDate(e.date)}</td>
          <td data-label="Amount" class="num amount">${formatINR(e.amount)}</td>
          <td class="actions-col">
            <button type="button" class="icon-btn" data-action="edit" aria-label="Edit ${escapeHTML(e.name)}" title="Edit">
              <svg viewBox="0 0 24 24" class="icon"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>
            </button>
            <button type="button" class="icon-btn danger" data-action="delete" aria-label="Delete ${escapeHTML(e.name)}" title="Delete">
              <svg viewBox="0 0 24 24" class="icon"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
            </button>
          </td>
        </tr>`;
    }).join('');

    const shown = rows.reduce((s, e) => s + e.amount, 0);
    $('#tableTotalLabel').textContent = isFiltered ? `Total (${rows.length} shown)` : 'Total spent';
    $('#tableTotal').textContent = formatINR(shown);
  }

  function renderAll() {
    renderDashboard();
    renderCategories();
    renderChart();
    renderHistory();
  }

  /* ---------- Expense form ---------- */

  const form = $('#expenseForm');
  const fields = {
    id: $('#expenseId'),
    name: $('#expenseName'),
    amount: $('#expenseAmount'),
    category: $('#expenseCategory'),
    date: $('#expenseDate'),
    notes: $('#expenseNotes'),
  };

  const setError = (inputId, msg) => {
    const el = document.querySelector(`.error[data-for="${inputId}"]`);
    if (el) el.textContent = msg || '';
    document.getElementById(inputId).classList.toggle('invalid', Boolean(msg));
  };

  const validateExpense = () => {
    let ok = true;
    const name = fields.name.value.trim();
    const amount = Number(fields.amount.value);
    setError('expenseName', name ? '' : 'Please enter an expense name.');
    setError('expenseAmount', fields.amount.value && amount > 0 ? '' : 'Enter an amount greater than ₹0.');
    setError('expenseDate', fields.date.value ? '' : 'Please pick a date.');
    if (!name || !(amount > 0) || !fields.date.value) ok = false;
    return ok;
  };

  const resetForm = () => {
    form.reset();
    fields.id.value = '';
    fields.date.value = todayISO();
    fields.category.value = CATEGORIES[0].id;
    ['expenseName', 'expenseAmount', 'expenseDate'].forEach((id) => setError(id, ''));
    $('#formTitle').textContent = 'Add Expense';
    $('#submitLabel').textContent = 'Add Expense';
    $('#cancelEditBtn').hidden = true;
    $('#add-expense').classList.remove('is-editing');
  };

  const startEdit = (id) => {
    const e = state.expenses.find((x) => x.id === id);
    if (!e) return;
    fields.id.value = e.id;
    fields.name.value = e.name;
    fields.amount.value = e.amount;
    fields.category.value = e.category;
    fields.date.value = e.date;
    fields.notes.value = e.notes;
    $('#formTitle').textContent = 'Edit Expense';
    $('#submitLabel').textContent = 'Update Expense';
    $('#cancelEditBtn').hidden = false;
    $('#add-expense').classList.add('is-editing');
    $('#add-expense').scrollIntoView({ behavior: 'smooth', block: 'start' });
    fields.name.focus({ preventScroll: true });
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!validateExpense()) return;

    const data = {
      name: fields.name.value.trim(),
      amount: Math.round(Number(fields.amount.value) * 100) / 100,
      category: fields.category.value,
      date: fields.date.value,
      notes: fields.notes.value.trim(),
    };
    const editingId = fields.id.value;

    if (editingId) {
      const idx = state.expenses.findIndex((e) => e.id === editingId);
      if (idx > -1) state.expenses[idx] = { ...state.expenses[idx], ...data };
      toast(`Updated “${data.name}”`);
    } else {
      state.expenses.push({ id: uid(), createdAt: Date.now(), ...data });
      toast(`Added ${data.name} · ${formatINR(data.amount)}`);
    }

    persist();
    renderAll();
    resetForm();
    fields.name.focus();
  });

  $('#cancelEditBtn').addEventListener('click', resetForm);

  $('#quickChips').addEventListener('click', (ev) => {
    const chip = ev.target.closest('.chip');
    if (!chip) return;
    fields.name.value = chip.dataset.name;
    fields.category.value = chip.dataset.category;
    setError('expenseName', '');
    fields.amount.focus();
  });

  /* ---------- History actions ---------- */

  $('#expenseRows').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    if (btn.dataset.action === 'edit') startEdit(id);
    if (btn.dataset.action === 'delete') askDelete(id, btn);
  });

  $('#searchInput').addEventListener('input', (ev) => { ui.search = ev.target.value; renderHistory(); });
  $('#filterCategory').addEventListener('change', (ev) => { ui.filter = ev.target.value; renderHistory(); });

  /* ---------- Modals ---------- */

  const openModal = (modal, focusEl) => {
    ui.lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    (focusEl || modal.querySelector('button, input')).focus();
  };

  const closeModal = (modal) => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (ui.lastFocus && document.contains(ui.lastFocus)) ui.lastFocus.focus();
  };

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (ev) => { if (ev.target.closest('[data-close]')) closeModal(modal); });
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const open = document.querySelector('.modal:not([hidden])');
    if (open) closeModal(open);
  });

  // Delete confirmation
  const confirmModal = $('#confirmModal');
  const askDelete = (id) => {
    const e = state.expenses.find((x) => x.id === id);
    if (!e) return;
    ui.pendingDeleteId = id;
    $('#confirmText').innerHTML = `Delete <strong>${escapeHTML(e.name)}</strong> (${formatINR(e.amount)} on ${formatDate(e.date)})? This can't be undone.`;
    openModal(confirmModal, $('#confirmDeleteBtn'));
  };

  $('#confirmDeleteBtn').addEventListener('click', () => {
    const e = state.expenses.find((x) => x.id === ui.pendingDeleteId);
    state.expenses = state.expenses.filter((x) => x.id !== ui.pendingDeleteId);
    if (fields.id.value === ui.pendingDeleteId) resetForm();
    ui.pendingDeleteId = null;
    persist();
    renderAll();
    closeModal(confirmModal);
    if (e) toast(`Deleted “${e.name}”`);
  });

  // Budget
  const budgetModal = $('#budgetModal');
  const budgetInput = $('#budgetInput');
  const openBudget = () => {
    budgetInput.value = state.budget > 0 ? state.budget : '';
    setError('budgetInput', '');
    openModal(budgetModal, budgetInput);
    budgetInput.select();
  };

  $('#editBudgetBtn').addEventListener('click', openBudget);
  $('#budgetAlert').addEventListener('click', (ev) => { if (ev.target.closest('[data-action="set-budget"]')) openBudget(); });

  $('#budgetForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const value = Number(budgetInput.value);
    if (budgetInput.value === '' || !(value >= 0)) {
      setError('budgetInput', 'Enter a valid budget amount.');
      return;
    }
    state.budget = Math.round(value * 100) / 100;
    persist();
    renderAll();
    closeModal(budgetModal);
    toast(`Budget set to ${formatINR(state.budget)}`);
  });

  /* ---------- Charts ---------- */

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      window.Charts.setMode(tab.dataset.chart);
      renderChart();
    });
  });

  /* ---------- CSV export ---------- */

  $('#exportBtn').addEventListener('click', () => {
    if (!state.expenses.length) {
      toast('Nothing to export yet — add an expense first.', 'error');
      return;
    }
    const { spent, remaining } = totals();
    const rows = [
      ['Date', 'Expense', 'Category', 'Amount (INR)', 'Notes'],
      ...sortedExpenses().map((e) => [e.date, e.name, e.category, e.amount.toFixed(2), e.notes]),
      [],
      ['', 'Total spent', '', spent.toFixed(2), ''],
      ['', 'Budget', '', state.budget.toFixed(2), ''],
      ['', 'Remaining', '', remaining.toFixed(2), ''],
    ];
    downloadFile(`munnar-trip-expenses-${todayISO()}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    toast('CSV exported');
  });

  /* ---------- Toast ---------- */

  let toastTimer;
  function toast(message, type = 'success') {
    const el = $('#toast');
    el.textContent = message;
    el.className = `toast toast-${type}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ---------- Init ---------- */

  const options = CATEGORIES.map((c) => `<option value="${c.id}">${c.icon} ${c.id}</option>`).join('');
  fields.category.innerHTML = options;
  $('#filterCategory').insertAdjacentHTML('beforeend', options);

  // Keep the totals in sync if the data is changed in another tab.
  window.addEventListener('storage', () => {
    const fresh = window.TripStorage.load();
    state.budget = fresh.budget;
    state.expenses = fresh.expenses;
    renderAll();
  });

  resetForm();
  renderAll();
})();
