import { Transaction } from "../../types";

export const exportTransactionsToCsv = (transactions: Transaction[], filename: string) => {
  // Calculate category totals first to populate the new column and the summary rows
  const categoryTotals: Record<string, number> = {};
  transactions.forEach(t => {
    // Only aggregate actual spending (positive amounts usually, excluding payments)
    if (t.amount > 0 && t.type !== 'Payment') {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  const headers = ["Date", "Type", "Description", "Category", "Amount", "Category Total"];
  
  const csvRows = transactions.map(t => {
    // Escape quotes in strings
    const escapedDesc = (t.description || '').replace(/"/g, '""');
    const escapedCat = (t.category || '').replace(/"/g, '""');
    const catTotal = categoryTotals[t.category] || 0;
    
    return [
      t.date,
      t.type,
      `"${escapedDesc}"`,
      `"${escapedCat}"`,
      t.amount.toFixed(2),
      catTotal.toFixed(2)
    ].join(",");
  });

  // Create the summary section
  const summaryHeader = ["", "", "", "", "", ""]; // Empty row for spacing
  const summaryTitle = ["CATEGORY SUMMARY", "", "", "", "", ""];
  const summaryCols = ["Category", "Total Spending", "", "", "", ""];
  
  const summaryRows = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]) // Sort by highest spend
    .map(([category, total]) => {
      const escapedCat = category.replace(/"/g, '""');
      return [`"${escapedCat}"`, total.toFixed(2), "", "", "", ""].join(",");
    });

  const finalCsvParts = [
    headers.join(","),
    ...csvRows,
    summaryHeader.join(","), // One empty row
    summaryTitle.join(","),
    summaryCols.join(","),
    ...summaryRows
  ];

  const csvString = finalCsvParts.join("\n");
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};