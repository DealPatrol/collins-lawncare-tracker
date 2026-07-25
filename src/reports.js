// ── Mileage & profit reports ────────────────────────────────────
// Turns data the app already tracks (GPS workday distance, job sessions)
// into IRS-ready mileage deductions and a plain revenue-minus-expenses
// profit picture — no new data entry required for mileage.

import { formatMoney } from "./utils.js";

// IRS standard business mileage rate, cents/mile. Changes yearly — kept as
// a Settings override since the app can't fetch it and shouldn't guess.
export const DEFAULT_MILEAGE_RATE = 0.7; // 2025 IRS rate; user can adjust for later years

function metersToMiles(m) {
  return (m || 0) / 1609.344;
}

// One row per employee per day they had recorded drive distance.
export function buildMileageRows(state, { fromKey, toKey } = {}) {
  const employees = Object.fromEntries(state.employees.map((e) => [e.id, e.name]));
  const rows = [];
  Object.entries(state.workdays || {}).forEach(([dayKey, crew]) => {
    if (fromKey && dayKey < fromKey) return;
    if (toKey && dayKey > toKey) return;
    Object.entries(crew).forEach(([empId, day]) => {
      const miles = metersToMiles(day.distanceMeters);
      if (miles <= 0) return;
      rows.push({
        dayKey,
        employee: employees[empId] || "Unassigned",
        miles,
      });
    });
  });
  return rows.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.employee.localeCompare(b.employee));
}

export function mileageTotal(rows) {
  return rows.reduce((a, r) => a + r.miles, 0);
}

export function buildMileageCsv(rows, rate) {
  const header = ["Date", "Employee", "Miles", "Purpose", `Deduction (@ $${rate.toFixed(3)}/mi)`];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    const deduction = (r.miles * rate).toFixed(2);
    lines.push([r.dayKey, `"${r.employee.replace(/"/g, '""')}"`, r.miles.toFixed(1), "Lawn care business travel", deduction].join(","));
  });
  const total = mileageTotal(rows);
  lines.push(["", "", "", "TOTAL", (total * rate).toFixed(2)].join(","));
  return lines.join("\n");
}

// ── Expenses / profit ─────────────────────────────────────────

export const EXPENSE_CATEGORIES = ["Fuel", "Equipment", "Maintenance", "Supplies", "Insurance", "Other"];

export function makeExpense(data) {
  return {
    id: `exp_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    date: data.date,
    category: data.category || "Other",
    amount: data.amount || 0,
    note: data.note || "",
    createdAt: Date.now(),
  };
}

export function expensesInRange(state, dayKeys) {
  const keys = new Set(dayKeys);
  return (state.expenses || []).filter((e) => keys.has(e.date));
}

export function expenseTotal(expenses) {
  return expenses.reduce((a, e) => a + (e.amount || 0), 0);
}

export function profitSummary(revenue, expenses) {
  const cost = expenseTotal(expenses);
  return { revenue, cost, profit: revenue - cost };
}

export function formatProfitLine({ revenue, cost, profit }) {
  return `${formatMoney(revenue)} revenue − ${formatMoney(cost)} expenses = ${formatMoney(profit)} profit`;
}
