# Munnar Trip Budget Tracker

A simple, responsive dashboard for tracking every rupee spent on our Munnar trip.

## Features

- **Dashboard** – total budget, total spent, remaining (or over-budget) amount, expense count, and a budget utilization bar.
- **Add expense** – name, amount (₹), category, date, optional notes, plus quick-fill chips (Hotel, Petrol, Food, Snacks, Entry Tickets…).
- **Expense history** – sorted by latest date, with search, category filter, edit, delete (with confirmation) and an automatic total.
- **Budget management** – set or update the budget at any time; warnings at 90% usage and when spending exceeds the budget.
- **Category summary + charts** – Travel, Accommodation, Food, Shopping, Activities, Other, shown as cards, a doughnut chart and a daily spend bar chart.
- **Persistence** – everything is saved automatically to the browser's LocalStorage; export all expenses as CSV.

## Run it

No build step. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 5173
```

Then visit http://localhost:5173.

## Structure

```
index.html        Page markup (dashboard, form, charts, categories, history, modals)
css/styles.css    Design tokens and all component styles (responsive)
js/utils.js       Categories, ₹ formatting, dates, CSV helpers
js/storage.js     LocalStorage load/save (key: munnarTripTracker.v1)
js/charts.js      Chart.js doughnut + daily bar chart
js/app.js         UI state, rendering and event handling
```

Charts use [Chart.js](https://www.chartjs.org/) 4.4.1 from cdnjs; the rest of the app works offline.
