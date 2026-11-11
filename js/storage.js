/* LocalStorage persistence for budget + expenses. */
(function (global) {
  'use strict';

  const KEY = 'munnarTripTracker.v1';
  const DEFAULT_STATE = { budget: 0, expenses: [] };

  const sanitizeExpense = (e) => ({
    id: String(e.id),
    name: String(e.name || '').trim(),
    amount: Math.round(Number(e.amount) * 100) / 100 || 0,
    category: String(e.category || 'Other'),
    date: String(e.date || ''),
    notes: String(e.notes || ''),
    createdAt: Number(e.createdAt) || Date.now(),
  });

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_STATE, expenses: [] };
      const parsed = JSON.parse(raw);
      return {
        budget: Math.max(0, Number(parsed.budget) || 0),
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses.filter((e) => e && e.id).map(sanitizeExpense) : [],
      };
    } catch (err) {
      console.warn('Could not read saved trip data:', err);
      return { ...DEFAULT_STATE, expenses: [] };
    }
  };

  const save = (state) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ budget: state.budget, expenses: state.expenses }));
      return true;
    } catch (err) {
      console.warn('Could not save trip data:', err);
      return false;
    }
  };

  global.TripStorage = { load, save, sanitizeExpense };
})(window);
