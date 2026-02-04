/**
 * Sheetsense SyncWorker (RSE Phase 4)
 * Encapsulates heavy CSV parsing and deconstruction to prevent UI thread stutter.
 */

const workerCode = `
self.onmessage = async function(e) {
    const { action, payload } = e.data;
    
    if (action === 'PARSE_DATA') {
        const { rawData, dataType, schema } = payload;
        
        try {
            const results = [];
            const lines = rawData.split(/\\r?\\n/);
            if (lines.length < 1) return;

            // Robust CSV Splitter (Handles quoted commas)
            const splitLine = (text) => {
                const parts = [];
                let curr = '';
                let inQuotes = false;
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { parts.push(curr.trim()); curr = ''; }
                    else curr += char;
                }
                parts.push(curr.trim());
                return parts.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
            };

            const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

            for (let i = 1; i < lines.length; i++) {
                const values = splitLine(lines[i]);
                if (values.every(v => v === '')) continue;

                const obj = {};
                Object.entries(schema.fields).forEach(([prop, def]) => {
                    const keys = def.keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    const idx = headers.findIndex(h => keys.includes(h));
                    if (idx !== -1) {
                        let val = values[idx];
                        if (def.type === 'number') {
                            const clean = (val || '').replace(/[^0-9.-]/g, '');
                            val = parseFloat(clean) || 0;
                        }
                        obj[prop] = val;
                    }
                });
                obj.id = crypto.randomUUID();
                obj.rowIndex = i;
                results.push(obj);
            }

            self.postMessage({ action: 'PARSE_COMPLETE', result: results, dataType });
        } catch (err) {
            self.postMessage({ action: 'ERROR', error: err.message });
        }
    }
};
`;

let worker: Worker | null = null;

export const getSyncWorker = (): Worker => {
    if (!worker) {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
    }
    return worker;
};
