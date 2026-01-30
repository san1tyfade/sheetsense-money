/**
 * StatementManifest
 * Central authority for PDF Parser heuristics.
 */

export const LEGAL_TEXT_MARKERS = [
  "Your obligations and rights for any billing error",
  "How we charge interest & your grace period",
  "Missed payments: Your annual interest rates will increase",
  "Amex Cardmember Agreement",
  "This is not a billing Statement",
  "FEES AND INTEREST RATES",
  "ABOUT YOUR STATEMENT",
  "Member Since",
  "Prepared for",
];

export const INTERNAL_TRANSFER_KEYWORDS = [
  "chequing account", "payment from", "payment received", "thank you",
  "automatic payment", "online payment", "transfer from", "total balance",
  "previous balance", "last billed statement", "mobile deposit", "credit card payment"
];

export const MONTH_MAP: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};