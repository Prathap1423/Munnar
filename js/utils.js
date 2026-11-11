/* Shared helpers: categories, INR formatting, dates, CSV. */
(function (global) {
  'use strict';

  const CATEGORIES = [
    { id: 'Travel', icon: '🚗', color: '#2563eb' },
    { id: 'Accommodation', icon: '🏨', color: '#7c3aed' },
    { id: 'Food', icon: '🍛', color: '#ea580c' },
    { id: 'Shopping', icon: '🛍️', color: '#db2777' },
    { id: 'Activities', icon: '🎟️', color: '#0d9488' },
    { id: 'Other', icon: '📦', color: '#64748b' },
  ];

  const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const inrPaise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ₹4,500 for whole rupees, ₹2,200.50 when paise are present.
  const formatINR = (value) => {
    const n = Math.round((Number(value) || 0) * 100) / 100;
    return (Number.isInteger(n) ? inrWhole : inrPaise).format(n);
  };

  const getCategory = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

  // Local YYYY-MM-DD (avoids UTC shift from toISOString).
  const todayISO = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const formatDate = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return iso || '';
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const escapeHTML = (str) =>
    String(str ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

  const csvCell = (value) => {
    const s = String(value ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

  const downloadFile = (filename, content, type) => {
    const blob = new Blob(['﻿' + content], { type }); // BOM so Excel reads ₹ correctly
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  global.Utils = { CATEGORIES, formatINR, getCategory, todayISO, formatDate, uid, escapeHTML, toCSV, downloadFile };
})(window);
