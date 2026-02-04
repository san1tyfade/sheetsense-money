import { useFinancialStore } from '../context/FinancialContext';
import { useRegistry } from './useRegistry';
import { Transaction, LedgerCommitPayload, JournalEntry, Asset, Trade, Subscription, BankAccount } from '../types';
import { updateLedgerValue, appendJournalEntries, batchUpdateLedgerValues } from '../services/sheetWriteService';
import { saveMerchantIdentity } from '../services/tools/toolMemoryService';

/**
 * useFinancialActions
 * High-level orchestration of business processes across various registries.
 */
export function useFinancialActions() {
  const store = useFinancialStore();
  const { notify, sync, sheetConfig, journalEntries } = store;

  // Utilize unified registry controllers
  const tradeCtrl = useRegistry<Trade>('trades');
  const assetCtrl = useRegistry<Asset>('assets');
  const subCtrl = useRegistry<Subscription>('subscriptions');
  const accCtrl = useRegistry<BankAccount>('accounts');
  const journalCtrl = useRegistry<JournalEntry>('journal');

  return {
    trades: tradeCtrl,
    assets: assetCtrl,
    subs: subCtrl,
    accounts: accCtrl,
    journal: {
      ...journalCtrl,
      edit: async (item: JournalEntry) => {
          const existing = journalEntries.find(j => j.id === item.id);
          if (existing && item.canonicalName && item.canonicalName !== existing.canonicalName) {
              await saveMerchantIdentity(item.description, item.canonicalName);
          }
          return journalCtrl.edit(item);
      },
      archive: async (source: string, txs: Transaction[]) => {
        notify('info', 'Persistence Protocol', `Transmitting ${txs.length} nodes to journal...`);
        await appendJournalEntries(sheetConfig.sheetId, sheetConfig.tabNames.journal, source, txs);
        notify('success', 'Stream Integrated', 'Financial events successfully archived.');
        sync(['journal']);
      }
    },
    ledger: {
      updateExpense: async (c: string, s: string, m: number, v: number) => {
          await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.expenses, c, s, m, v);
          sync(['expenses']);
      },
      updateIncome: async (c: string, s: string, m: number, v: number) => {
          await updateLedgerValue(sheetConfig.sheetId, sheetConfig.tabNames.income, c, s, m, v);
          sync(['income']);
      },
      batchUpdateExpense: async (p: LedgerCommitPayload) => {
          await batchUpdateLedgerValues(sheetConfig.sheetId, sheetConfig.tabNames.expenses, p);
          sync(['expenses']);
      }
    }
  };
}
