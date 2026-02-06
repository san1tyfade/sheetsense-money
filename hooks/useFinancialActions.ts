import { useFinancialStore } from '../context/FinancialContext';
import { useEntityController } from './useEntityController';
import { Transaction, LedgerCommitPayload, JournalEntry } from '../types';
import { updateLedgerValue, appendJournalEntries, batchUpdateLedgerValues } from '../services/sheetWriteService';
import { saveMerchantIdentity } from '../services/tools/toolMemoryService';

export function useFinancialActions() {
  const store = useFinancialStore();
  const { 
    trades, setTrades, assets, setAssets, 
    subscriptions, setSubscriptions, accounts, setAccounts, 
    journalEntries, setJournalEntries, notify, sync, sheetConfig 
  } = store;

  const tradeCtrl = useEntityController(trades, setTrades, 'trades', 'trades');
  const assetCtrl = useEntityController(assets, setAssets, 'assets', 'assets');
  const subCtrl = useEntityController(subscriptions, setSubscriptions, 'subscriptions', 'subscriptions');
  const accCtrl = useEntityController(accounts, setAccounts, 'accounts', 'accounts');
  const journalCtrl = useEntityController(journalEntries, setJournalEntries, 'journal', 'journal');

  return {
    trades: tradeCtrl,
    assets: assetCtrl,
    subs: subCtrl,
    accounts: accCtrl,
    journal: {
      ...journalCtrl,
      edit: async (item: JournalEntry) => {
          // If the entry already exists in the pool, check if identity memory needs updating
          const existing = journalEntries.find(j => j.id === item.id);
          if (existing && item.canonicalName && item.canonicalName !== existing.canonicalName) {
              await saveMerchantIdentity(item.description, item.canonicalName);
          }
          return journalCtrl.edit(item);
      },
      archive: async (source: string, txs: Transaction[]) => {
        notify('info', 'Archiving', `Transmitting ${txs.length} nodes...`);
        await appendJournalEntries(sheetConfig.sheetId, sheetConfig.tabNames.journal, source, txs);
        notify('success', 'History Integrated', 'Journal successfully updated.');
        sync(['journal']);
      }
    },
    ledger: {
      updateExpense: async (c: string, s: string, m: number, v: number) => {
          await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.expenses, c, s, m, v);
          sync(['expenses']);
      },
      // Added updateIncome to fix missing property error in components/IncomeView.tsx
      updateIncome: async (c: string, s: string, m: number, v: number) => {
          await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.income, c, s, m, v);
          sync(['income']);
      },
      batchUpdateExpense: async (p: LedgerCommitPayload) => {
          await batchUpdateLedgerValues(sheetConfig.sheetId, sheetConfig.tabNames.expenses, p);
          sync(['expenses']);
      }
    },
    uplinkAll: async () => {
        // Correctly using setIsSyncing from store (added in FinancialContext fix)
        store.setIsSyncing(true);
        try {
            await Promise.all([tradeCtrl.uplink(), assetCtrl.uplink(), subCtrl.uplink(), accCtrl.uplink(), journalCtrl.uplink()]);
            await sync();
            notify('success', 'Uplink Optimized', 'Cloud and Hardware are now synchronized.');
        } finally { store.setIsSyncing(false); }
    }
  };
}