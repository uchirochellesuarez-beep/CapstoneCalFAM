const EXPENSE_LINE_CATEGORIES = [
  { key: 'fuel_and_oil', label: 'Fuel & Oil', description: 'Fuel & Oil' },
  { key: 'labor_cost', label: 'Labor Cost', description: 'Operator and Helper wages' },
  { key: 'per_diem', label: 'Per Diem', description: 'Incentive per hectare/sq.m/hour of service' },
  { key: 'repair_and_maintenance', label: 'Repair & Maintenance', description: 'Repair & Maintenance' },
  { key: 'office_supply', label: 'Office Supply', description: 'Ballpen, etc.' },
  { key: 'communication_expense', label: 'Communication', description: 'Load/Internet' },
  { key: 'utilities_expense', label: 'Utilities', description: 'Water and electricity' },
  { key: 'sundries', label: 'Sundries', description: 'Other expenses' }
];

function parseExpenseAmount(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function buildExpenseReceiptLineItems(expenseRow) {
  const items = [];
  const expenseDate = expenseRow.date_of_expense;

  for (const cat of EXPENSE_LINE_CATEGORIES) {
    const amount = parseExpenseAmount(expenseRow[cat.key]);
    if (amount > 0) {
      items.push({
        date: expenseDate,
        category: cat.label,
        description: cat.description,
        amount
      });
    }
  }

  if (items.length === 0) {
    const total = parseExpenseAmount(expenseRow.total_amount);
    if (total > 0) {
      if (expenseRow.booking_id || expenseRow.operator_id) {
        items.push({
          date: expenseDate,
          category: 'Labor Cost',
          description: 'Operator and Helper wages',
          amount: total
        });
      } else {
        items.push({
          date: expenseDate,
          category: 'Machinery Expense',
          description: String(expenseRow.particulars || '').trim() || 'Machinery expense',
          amount: total
        });
      }
    }
  }

  return items;
}

module.exports = {
  EXPENSE_LINE_CATEGORIES,
  buildExpenseReceiptLineItems
};
