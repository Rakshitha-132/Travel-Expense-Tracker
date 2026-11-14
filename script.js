let budget = Number(localStorage.getItem("travelBudget")) || 0;
let expenses = JSON.parse(localStorage.getItem("travelExpenses") || "[]");
let chart = null;
let editingExpenseId = null;

const categories = ["Food", "Transport", "Hotel", "Shopping", "Other"];

const formatMoney = value =>
  "₹" + value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function saveData() {
  localStorage.setItem("travelBudget", budget);
  localStorage.setItem("travelExpenses", JSON.stringify(expenses));
}

function setBudget(event) {
  event.preventDefault();
  const value = Number(document.getElementById("budget").value);

  if (!Number.isFinite(value) || value <= 0) {
    alert("Enter a valid budget.");
    return;
  }

  budget = value;
  saveData();
  updateDashboard();
}

document.getElementById("budgetForm").addEventListener("submit", setBudget);

document.getElementById("date").value =
  new Date().toLocaleDateString("en-CA");

document.getElementById("expenseForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const description = document.getElementById("description").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;

  if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
    alert("Enter valid expense details.");
    return;
  }

  expenses.push({
    id: crypto.randomUUID(),
    description,
    amount,
    category,
    date
  });

  saveData();
  updateDashboard();
  this.reset();
  document.getElementById("date").value =
    new Date().toLocaleDateString("en-CA");
});

document.getElementById("expenseSearch").addEventListener("input", renderExpenseList);
document.getElementById("categoryFilter").addEventListener("change", renderExpenseList);
document.getElementById("exportButton").addEventListener("click", exportExpenses);

function deleteExpense(id) {
  expenses = expenses.filter(expense => expense.id !== id);
  if (editingExpenseId === id) editingExpenseId = null;
  saveData();
  updateDashboard();
}

function updateDashboard() {
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balance = budget - spent;
  const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const balanceDisplay = document.getElementById("balanceDisplay");
  const progressTrack = document.getElementById("budgetProgress");
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyExpenses = expenses.filter(expense => expense.date.startsWith(monthKey));
  const monthlySpent = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  document.getElementById("budgetDisplay").textContent = formatMoney(budget);
  document.getElementById("spentDisplay").textContent = formatMoney(spent);
  balanceDisplay.textContent = formatMoney(balance);
  balanceDisplay.classList.toggle("over-budget", balance < 0);
  document.getElementById("monthlySpentDisplay").textContent = formatMoney(monthlySpent);
  document.getElementById("monthlyExpenseCount").textContent =
    `${monthlyExpenses.length} ${monthlyExpenses.length === 1 ? "expense" : "expenses"} this month`;
  document.getElementById("monthlyLabel").textContent =
    `Spent in ${now.toLocaleDateString("en-IN", { month: "short" })}`;

  document.getElementById("budgetProgressBar").style.width = `${progress}%`;
  progressTrack.setAttribute("aria-valuenow", Math.round(progress));
  progressTrack.classList.toggle("over-budget", spent > budget && budget > 0);

  const progressText = document.getElementById("budgetProgressText");
  if (budget <= 0) {
    progressText.textContent = "Set a budget to track your spending.";
  } else if (spent > budget) {
    progressText.textContent = `${formatMoney(spent - budget)} over budget`;
  } else {
    progressText.textContent = `${Math.round(progress)}% of your budget used`;
  }

  renderExpenseList();
  updateChart();
}

function getFilteredExpenses() {
  const query = document.getElementById("expenseSearch").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;

  return expenses.filter(expense => {
    const matchesQuery = !query ||
      [expense.description, expense.category, expense.date]
        .some(value => String(value).toLowerCase().includes(query));
    const matchesCategory = !category || expense.category === category;
    return matchesQuery && matchesCategory;
  });
}

function renderExpenseList() {
  const list = document.getElementById("expenseList");
  const emptyState = document.getElementById("expenseEmptyState");
  const emptyTitle = document.getElementById("expenseEmptyTitle");
  const emptyMessage = document.getElementById("expenseEmptyMessage");
  const filteredExpenses = getFilteredExpenses();
  const hasFilters = document.getElementById("expenseSearch").value.trim() ||
    document.getElementById("categoryFilter").value;

  list.replaceChildren();
  emptyState.hidden = filteredExpenses.length > 0;
  if (expenses.length === 0) {
    emptyTitle.textContent = "No expenses yet";
    emptyMessage.textContent = "Your travel purchases will show up here.";
  } else {
    emptyTitle.textContent = "No matching expenses";
    emptyMessage.textContent = "Try another search or category.";
  }

  const shownCount = filteredExpenses.length;
  const totalCount = expenses.length;
  document.getElementById("expenseCount").textContent = hasFilters
    ? `${shownCount} of ${totalCount} ${totalCount === 1 ? "expense" : "expenses"}`
    : `${totalCount} ${totalCount === 1 ? "expense" : "expenses"}`;
  document.getElementById("exportButton").disabled = shownCount === 0;

  [...filteredExpenses].reverse().forEach(expense => {
    list.appendChild(expense.id === editingExpenseId
      ? createExpenseEditForm(expense)
      : createExpenseItem(expense));
  });
}

function createExpenseItem(expense) {
  const item = document.createElement("div");
  item.className = "expense-item";

  const details = document.createElement("div");
  details.className = "expense-main";

  const mark = document.createElement("span");
  mark.className = `category-mark category-${expense.category.toLowerCase()}`;
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = expense.category.slice(0, 1);

  const info = document.createElement("div");
  info.className = "expense-info";

  const description = document.createElement("strong");
  description.textContent = expense.description;

  const metadata = document.createElement("span");
  metadata.textContent = `${expense.category} · ${formatDate(expense.date)}`;
  info.append(description, metadata);
  details.append(mark, info);

  const trailing = document.createElement("div");
  trailing.className = "expense-trailing";

  const amount = document.createElement("strong");
  amount.className = "expense-amount";
  amount.textContent = formatMoney(expense.amount);

  const actions = document.createElement("div");
  actions.className = "expense-actions";

  const editButton = document.createElement("button");
  editButton.className = "text-button";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${expense.description}`);
  editButton.addEventListener("click", () => {
    editingExpenseId = expense.id;
    renderExpenseList();
    document.querySelector(".expense-edit-form input")?.focus();
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Remove";
  deleteButton.setAttribute("aria-label", `Remove ${expense.description}`);
  deleteButton.addEventListener("click", () => deleteExpense(expense.id));

  actions.append(editButton, deleteButton);
  trailing.append(amount, actions);
  item.append(details, trailing);
  return item;
}

function createExpenseEditForm(expense) {
  const item = document.createElement("div");
  item.className = "expense-item editing";

  const form = document.createElement("form");
  form.className = "expense-edit-form";

  const description = document.createElement("input");
  description.type = "text";
  description.value = expense.description;
  description.required = true;
  description.setAttribute("aria-label", "Expense name");

  const amount = document.createElement("input");
  amount.type = "number";
  amount.value = expense.amount;
  amount.min = "0.01";
  amount.step = "0.01";
  amount.required = true;
  amount.setAttribute("aria-label", "Amount");

  const category = document.createElement("select");
  category.setAttribute("aria-label", "Category");
  const options = categories.includes(expense.category)
    ? categories
    : [expense.category, ...categories];
  options.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === expense.category;
    category.appendChild(option);
  });

  const date = document.createElement("input");
  date.type = "date";
  date.value = expense.date;
  date.required = true;
  date.setAttribute("aria-label", "Date");

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const saveButton = document.createElement("button");
  saveButton.className = "save-edit-button";
  saveButton.type = "submit";
  saveButton.textContent = "Save";

  const cancelButton = document.createElement("button");
  cancelButton.className = "text-button";
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => {
    editingExpenseId = null;
    renderExpenseList();
  });

  actions.append(saveButton, cancelButton);
  form.append(description, amount, category, date, actions);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = description.value.trim();
    const value = Number(amount.value);

    if (!name || !Number.isFinite(value) || value <= 0 || !date.value) {
      alert("Enter valid expense details.");
      return;
    }

    expenses = expenses.map(item => item.id === expense.id
      ? {
          ...item,
          description: name,
          amount: value,
          category: category.value,
          date: date.value
        }
      : item);
    editingExpenseId = null;
    saveData();
    updateDashboard();
  });

  item.appendChild(form);
  return item;
}

function exportExpenses() {
  const records = [...getFilteredExpenses()].reverse();
  if (records.length === 0) return;

  const rows = [
    ["Date", "Description", "Category", "Amount (INR)"],
    ...records.map(expense => [
      expense.date,
      expense.description,
      expense.category,
      expense.amount.toFixed(2)
    ])
  ];

  const csv = "\uFEFF" + rows
    .map(row => row.map(escapeCsvValue).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `travel-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeCsvValue(value) {
  let text = String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function updateChart() {
  const canvas = document.getElementById("expenseChart");
  const emptyState = document.getElementById("chartEmptyState");

  if (expenses.length === 0) {
    if (chart) chart.destroy();
    chart = null;
    canvas.hidden = true;
    emptyState.hidden = false;
    return;
  }

  canvas.hidden = false;
  emptyState.hidden = true;
  const totals = {};

  expenses.forEach(expense => {
    totals[expense.category] =
      (totals[expense.category] || 0) + expense.amount;
  });

  if (chart) chart.destroy();

  chart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(totals),
      datasets: [{
        data: Object.values(totals),
        backgroundColor: [
          "#4f8060", "#7189ad", "#bd8b5a",
          "#9b7897", "#9aa39d"
        ],
        borderColor: "#ffffff",
        borderWidth: 4,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 7,
            boxHeight: 7,
            padding: 18,
            color: "#78827d",
            font: { family: "DM Sans, Segoe UI, sans-serif", size: 13 }
          }
        },
        tooltip: {
          callbacks: {
            label: context => ` ${context.label}: ${formatMoney(context.raw)}`
          }
        }
      }
    }
  });
}

updateDashboard();
