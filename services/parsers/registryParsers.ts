import { DebtEntry } from '../../types';
import { generateId, parseNumber, parseFlexibleDate } from './parserUtils';

/**
 * Specialized parser for the Debt Schedule tab.
 * Retained because it interfaces with a specific row-offset layout in the spreadsheet template.
 */
export const createDebtParser = () => {
    return (values: string[]): DebtEntry | null => {
        const dateStr = (values[1] || '').trim();
        const iso = parseFlexibleDate(dateStr);
        if (!iso) return null;

        const amountOwed = parseNumber(values[6]); 
        const monthlyPayment = parseNumber(values[3]); 
        const startingBalance = parseNumber(values[2]); 

        if (startingBalance === 0 && monthlyPayment === 0 && amountOwed === 0) return null;

        return { 
            id: generateId(), 
            name: `Loan Schedule (${dateStr})`, 
            amountOwed, 
            interestRate: 0, 
            monthlyPayment, 
            date: iso 
        };
    };
};