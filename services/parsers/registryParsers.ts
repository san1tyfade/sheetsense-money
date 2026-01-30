import { DebtEntry } from '../../types';
import { generateId, parseNumber } from './parserUtils';
import { TemporalSovereign } from '../temporalService';

/**
 * Specialized parser for the Debt Schedule tab.
 */
export const createDebtParser = () => {
    return (values: string[]): DebtEntry | null => {
        const dateStr = (values[1] || '').trim();
        const iso = TemporalSovereign.parseFlexible(dateStr);
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
