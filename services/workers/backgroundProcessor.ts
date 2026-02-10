/**
 * Sheetsense Background Processor
 * Offloads CPU-intensive tasks from the main thread.
 */

const createWorker = (fn: Function) => {
    const blob = new Blob([`(${fn.toString()})()`], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
};

// Logic to be executed inside the worker
const workerLogic = () => {
    self.onmessage = async (e: MessageEvent) => {
        const { type, payload } = e.data;

        try {
            switch (type) {
                case 'CRYPTO_SIGN':
                    // High-latency canonical stringify and hashing
                    const { data, salt, sheetId } = payload;
                    const canonical = JSON.stringify(data); // Simple for worker
                    const encoder = new TextEncoder();
                    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonical + salt + sheetId));
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    self.postMessage({ type: 'SUCCESS', result: hashHex });
                    break;

                default:
                    self.postMessage({ type: 'ERROR', error: 'UNKNOWN_TASK' });
            }
        } catch (err: any) {
            self.postMessage({ type: 'ERROR', error: err.message });
        }
    };
};

