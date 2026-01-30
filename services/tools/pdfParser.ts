import { StatementFormat, Transaction, StatementData } from "../../types";
import { LEGAL_TEXT_MARKERS, INTERNAL_TRANSFER_KEYWORDS, MONTH_MAP } from "../../config/StatementManifest";

declare const pdfjsLib: any;

const initPdfWorker = () => {
    if (typeof window !== 'undefined' && 'pdfjsLib' in window && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        return true;
    }
    return false;
};

initPdfWorker();

interface TextItem { str: string; x: number; y: number; }
interface ReconstructedLine { text: string; page: number; yearHint?: number; }

const sanitizeText = (str: string): string => {
    if (!str) return '';
    return str.replace(/[\u00AD\u00A0\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
};

const resolveTransactionDate = (dateStr: string, anchorYear: number, closingMonth: number): string => {
    try {
        const cleanDateStr = sanitizeText(dateStr);
        const monthMatch = cleanDateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        const dayMatch = cleanDateStr.match(/\b(\d{1,2})\b/);
        
        if (!monthMatch || !dayMatch) return dateStr;

        const monthKey = monthMatch[0].toLowerCase().substring(0, 3);
        const txMonth = MONTH_MAP[monthKey];
        const txDay = parseInt(dayMatch[1]);

        if (txMonth === undefined || isNaN(txDay)) return dateStr;

        let txYear = anchorYear;
        if (txMonth > closingMonth && (closingMonth === 0 || closingMonth === 1)) {
            txYear = anchorYear - 1;
        }

        const finalDate = new Date(txYear, txMonth, txDay);
        return finalDate.toISOString().split('T')[0];
    } catch (e) {
        return dateStr;
    }
};

export const parsePdfStatement = async (file: File): Promise<StatementData> => {
  const ready = initPdfWorker();
  if (!ready && !('pdfjsLib' in window)) throw new Error("PDF_ENGINE_UNAVAILABLE");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  
  const allReconstructedLines: ReconstructedLine[] = [];
  let detectedFormat: StatementFormat | null = null;
  let rawFullText = "";
  let globalStatementYear = new Date().getFullYear();
  let globalStatementMonth = new Date().getMonth();

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items.map((item: any) => ({
      str: item.str || "",
      x: item.transform ? item.transform[4] : 0,
      y: item.transform ? item.transform[5] : 0
    }));

    const pageText = items.map(it => it.str).join(" ");
    rawFullText += pageText + " ";

    const amexHeaderMatch = pageText.match(/Closing Date\s+[A-Za-z]{3,9}\s+\d{1,2},?\s+(202\d)/i);
    const pageYearHint = amexHeaderMatch ? parseInt(amexHeaderMatch[1]) : null;

    if (pageYearHint && i === 1) {
        globalStatementYear = pageYearHint;
        const monthStrMatch = pageText.match(/Closing Date\s+([A-Za-z]{3,9})/i);
        if (monthStrMatch) {
            const m = monthStrMatch[1].toLowerCase().substring(0, 3);
            if (MONTH_MAP[m] !== undefined) globalStatementMonth = MONTH_MAP[m];
        }
    }

    if (!detectedFormat) {
      if (/American Express|Cobalt|Amex/i.test(pageText)) detectedFormat = StatementFormat.AMEX_COBALT;
      else if (/Wealthsimple/i.test(pageText)) detectedFormat = StatementFormat.WEALTHSIMPLE_VISA;
    }

    const sortedByY = items.sort((a, b) => b.y - a.y);
    const lines: TextItem[][] = [];
    if (sortedByY.length > 0) {
      let currentLine: TextItem[] = [sortedByY[0]];
      for (let j = 1; j < sortedByY.length; j++) {
        if (Math.abs(sortedByY[j-1].y - sortedByY[j].y) < 10) currentLine.push(sortedByY[j]);
        else { lines.push(currentLine); currentLine = [sortedByY[j]]; }
      }
      lines.push(currentLine);
    }

    for (const lineItems of lines) {
      const lineText = sanitizeText(lineItems.sort((a, b) => a.x - b.x).map(item => item.str).join(" "));
      if (!lineText || lineText.length < 3) continue;
      if (LEGAL_TEXT_MARKERS.some(marker => lineText.includes(marker))) continue;
      allReconstructedLines.push({ text: lineText, page: i, yearHint: pageYearHint || globalStatementYear });
    }
  }

  const extractedTransactions: Transaction[] = [];
  let balance = 0;
  const dateSubPattern = /(?:\d{1,2}\s+[A-Za-z]{3,9}\.?|[A-Za-z]{3,9}\.?\s+\d{1,2})/;
  const amountPattern = /([\-\u2013\u2014]?\s*\$?\s*[\d,]+\.\d{2}(?:\s*CR)?)$/i;

  allReconstructedLines.forEach((lineObj, index) => {
    const line = lineObj.text;
    if (balance === 0) {
      const balMatch = line.match(/(?:STATEMENT BALANCE|New balance|Total Balance|Balance Due)\s+([\$–\-\u2013\u2014]?\s*[\d,]+\.\d{2})/i);
      if (balMatch) balance = parseFloat(balMatch[1].replace(/[$,\s]/g, '').replace(/[\u2013\u2014]/g, '-'));
    }

    const regex = new RegExp(`^(${dateSubPattern.source})\\s+(?:${dateSubPattern.source}\\s+)?(.+?)\\s+${amountPattern.source}`, 'i');
    const match = line.match(regex);
    
    if (match) {
        const tRawDate = match[1];
        const tDesc = match[2];
        const tAmountStr = match[3];
        
        if (!tDesc || !tAmountStr) return;
        const normalizedDesc = tDesc.trim().toLowerCase();
        if (INTERNAL_TRANSFER_KEYWORDS.some(k => normalizedDesc.includes(k))) return;

        const isCredit = tAmountStr.toUpperCase().includes("CR") || tAmountStr.includes("-");
        let amount = parseFloat(tAmountStr.replace(/CR/i, '').replace(/[\u2013\u2014]/g, '-').replace(/[$,\s]/g, '').trim());
        if (isCredit && amount > 0) amount = -amount;

        const yearToUse = lineObj.yearHint || globalStatementYear;
        const resolvedISO = resolveTransactionDate(tRawDate, yearToUse, globalStatementMonth);

        extractedTransactions.push({
          id: `tx-${resolvedISO}-${index}`,
          date: resolvedISO,
          description: tDesc.trim(),
          amount: amount,
          type: amount < 0 ? 'Payment' : 'Purchase',
          category: 'Uncategorized'
        });
    }
  });

  return {
    balance,
    transactions: extractedTransactions,
    totalSpent: extractedTransactions.reduce((sum, t) => t.amount > 0 ? sum + t.amount : sum, 0),
    format: detectedFormat || StatementFormat.WEALTHSIMPLE_VISA,
    totalPages
  };
};