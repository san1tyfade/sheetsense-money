import { vi } from 'vitest';

export const createMockGoogleClient = (overrides: Record<string, any> = {}) => {
    const request = overrides.request || vi.fn();

    // Default mocks that forward to the main request mock if not properly mocked
    const getRange = overrides.getRange || vi.fn((sheetId, range) => {
        return request(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`);
    });

    const batchUpdate = overrides.batchUpdate || vi.fn((sheetId, body) => {
        return request(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: 'POST',
            body
        });
    });

    return {
        googleClient: {
            request,
            getRange,
            batchUpdate,
            ...overrides
        }
    };
};
