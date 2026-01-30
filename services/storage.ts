import { MortgageScenario } from '../types';
import { openDatabase, DB_CONFIG } from './infrastructure/DatabaseProvider';

const MORTGAGE_KEY = 'fintrack_mortgage_scenarios';

const getMtgDB = () => openDatabase(DB_CONFIG.APP.NAME, DB_CONFIG.APP.VERSION, DB_CONFIG.APP.STORE);

export const saveMortgageScenario = async (scenario: MortgageScenario): Promise<void> => {
    const db = await getMtgDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_CONFIG.APP.STORE, 'readwrite');
        const store = tx.objectStore(DB_CONFIG.APP.STORE);
        const getReq = store.get(MORTGAGE_KEY);
        
        getReq.onsuccess = () => {
            const list = getReq.result || [];
            list.push(scenario);
            const putReq = store.put(list, MORTGAGE_KEY);
            putReq.onsuccess = () => resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const getMortgageScenarios = async (): Promise<MortgageScenario[]> => {
    const db = await getMtgDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_CONFIG.APP.STORE, 'readonly');
        const store = tx.objectStore(DB_CONFIG.APP.STORE);
        const req = store.get(MORTGAGE_KEY);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

export const deleteMortgageScenario = async (id: string): Promise<void> => {
    const db = await getMtgDB();
    const list = await getMortgageScenarios();
    const filtered = list.filter(s => s.id !== id);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_CONFIG.APP.STORE, 'readwrite');
        const store = tx.objectStore(DB_CONFIG.APP.STORE);
        const req = store.put(filtered, MORTGAGE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};
