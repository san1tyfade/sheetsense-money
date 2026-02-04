import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { calculateAmortization, RENEWAL_YEAR_BENCHMARK } from '../services/mortgageService';
import { MortgageInput, PaymentFrequency, MortgageScenario, AmortizationPoint } from '../types';
import { saveMortgageScenario, getMortgageScenarios, deleteMortgageScenario } from '../services/storage';
import { haptics } from '../services/infrastructure/HapticService';

export const useMortgageCalculator = () => {
    const [inputs, setInputs] = useState<MortgageInput>({
        principal: 580000,
        interestRate: 3.8,
        termYears: 25,
        extraMonthly: 100,
        extraAnnualPercent: 0,
        lumpSumAmount: 0,
        lumpSumMonth: 12,
        frequency: PaymentFrequency.ACC_BI_WEEKLY,
        propertyTaxes: 3000,
        heatingCost: 200,
        isStressTestEnabled: false,
        renewalRate: 7.24
    });

    const [scenarios, setScenarios] = useState<MortgageScenario[]>([]);
    const [scenarioName, setScenarioName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadScenarios();
    }, []);

    const loadScenarios = async () => {
        const list = await getMortgageScenarios();
        setScenarios(list.sort((a, b) => b.timestamp - a.timestamp));
    };

    const handleSaveScenario = async () => {
        if (!scenarioName.trim()) return;
        haptics.click('light');
        setIsSaving(true);
        const newScenario: MortgageScenario = {
            id: crypto.randomUUID(),
            name: scenarioName.trim(),
            inputs: { ...inputs },
            timestamp: Date.now()
        };
        try {
            await saveMortgageScenario(newScenario);
            setScenarioName("");
            await loadScenarios();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        haptics.click('heavy');
        if (!confirm("Irreversibly delete this scenario protocol?")) return;
        await deleteMortgageScenario(id);
        await loadScenarios();
    };

    const handleLoadScenario = (scenario: MortgageScenario) => {
        haptics.click('soft');
        setInputs(scenario.inputs);
    };

    const handleInputChange = (key: keyof MortgageInput, value: any) => {
        setInputs(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        haptics.click('soft');
        setInputs({
            principal: 580000,
            interestRate: 3.8,
            termYears: 25,
            extraMonthly: 100,
            extraAnnualPercent: 0,
            lumpSumAmount: 0,
            lumpSumMonth: 12,
            frequency: PaymentFrequency.ACC_BI_WEEKLY,
            propertyTaxes: 3000,
            heatingCost: 200,
            isStressTestEnabled: false,
            renewalRate: 7.24
        });
    };

    const schedule = useMemo(() => calculateAmortization(inputs), [inputs]);

    const stats = useMemo(() => {
        const finalPoint = (schedule[schedule.length - 1] || {
            totalInterest: 0,
            period: 0,
            acceleratedTotalInterest: 0,
            year: 0,
            acceleratedBalance: 0,
            acceleratedPayment: 0
        }) as AmortizationPoint;

        const lastAcc = schedule.find(s => s.acceleratedBalance <= 0) || finalPoint;

        const timeSavedPeriods = Math.max(0, schedule.length - (lastAcc.period || 0) - 1);
        const periodsPerYear = inputs.frequency === PaymentFrequency.MONTHLY ? 12 : 26;

        const milestonePeriod = periodsPerYear * RENEWAL_YEAR_BENCHMARK;
        const mPoint = schedule[Math.min(milestonePeriod, schedule.length - 1)] || { acceleratedBalance: 0 };

        const monthlyPre = schedule.length > 2
            ? (schedule[Math.max(1, Math.min(schedule.length - 1, milestonePeriod - 1))].acceleratedPayment * periodsPerYear) / 12
            : 0;
        const monthlyPost = schedule.length > 2
            ? (schedule[Math.min(schedule.length - 1, milestonePeriod + 1)].acceleratedPayment * periodsPerYear) / 12
            : 0;
        const shockAmount = Math.max(0, monthlyPost - monthlyPre);

        return {
            interestSaved: Math.max(0, finalPoint.totalInterest - lastAcc.acceleratedTotalInterest),
            yearsSaved: Math.floor(timeSavedPeriods / periodsPerYear),
            monthsSaved: Math.round((timeSavedPeriods % periodsPerYear) / (periodsPerYear / 12)),
            totalInterest: finalPoint.totalInterest,
            payoffYear: new Date().getFullYear() + (lastAcc.year || 0),
            milestone: {
                balance: mPoint.acceleratedBalance,
                equity: Math.max(0, inputs.principal - mPoint.acceleratedBalance),
                ratio: ((inputs.principal - mPoint.acceleratedBalance) / (inputs.principal || 1)) * 100
            },
            pith: {
                total: (schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (inputs.propertyTaxes / 12) + inputs.heatingCost,
                taxPercent: ((inputs.propertyTaxes / 12) / (((schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (inputs.propertyTaxes / 12) + inputs.heatingCost) || 1)) * 100,
                heatPercent: (inputs.heatingCost / (((schedule[1]?.acceleratedPayment || 0) * (periodsPerYear / 12) + (inputs.propertyTaxes / 12) + inputs.heatingCost) || 1)) * 100
            },
            shock: {
                amount: shockAmount,
                percent: (shockAmount / (monthlyPre || 1)) * 100
            }
        };
    }, [schedule, inputs]);

    return {
        inputs,
        actions: { handleInputChange, handleReset, handleSaveScenario, handleDeleteScenario, handleLoadScenario, setScenarioName },
        data: { schedule, stats, scenarios, scenarioName, isSaving }
    };
};
