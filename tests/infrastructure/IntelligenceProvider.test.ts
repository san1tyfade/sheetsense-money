import { describe, it, expect, vi } from 'vitest';
import { cleanMerchantDescription, intelligentCategorize } from '../../services/infrastructure/IntelligenceProvider';

describe('IntelligenceProvider: Neural Core', () => {
  
  describe('Strategy 1: Deterministic Cleaning', () => {
    it('should strip noise like hashtags, long codes, and locations', () => {
      const inputs = [
        'WALMART #1234 BENTALL',
        'SQ *MERCHANT NAME 987654321',
        'UBER   TRIP   HELP.UBER.COM',
        'AMZN MKTP CA*R123456'
      ];
      
      expect(cleanMerchantDescription(inputs[0])).toBe('WALMART');
      expect(cleanMerchantDescription(inputs[1])).toBe('MERCHANT NAME');
      expect(cleanMerchantDescription(inputs[2])).toBe('UBER TRIP HELP UBER COM');
      expect(cleanMerchantDescription(inputs[3])).toBe('AMZN MKTP');
    });
  });

  describe('Strategy 2: Neural Integration (Gemini Mock)', () => {
    it('should map unknown merchants to target categories via AI mock', async () => {
      const mockTx = [{ id: '1', date: '2024-01-01', description: 'NEW_UNKNOWN_VENDOR', amount: 50, category: 'Uncategorized', type: 'EXPENSE' }];
      
      // Standard class mock pattern for Vitest
      vi.mock('@google/genai', () => {
        class MockGoogleGenAI {
          models = {
            generateContent: vi.fn().mockResolvedValue({
              text: JSON.stringify([{
                description: 'NEW_UNKNOWN_VENDOR',
                category: 'Dining',
                canonicalName: 'Vendor Brand'
              }])
            })
          };
        }
        
        return { 
          GoogleGenAI: MockGoogleGenAI,
          Type: { ARRAY: 'ARRAY', OBJECT: 'OBJECT', STRING: 'STRING' }
        };
      });

      const results = await intelligentCategorize(mockTx, ['Dining', 'Housing']);
      
      expect(results[0].category).toBe('Dining');
      expect(results[0].canonicalName).toBe('Vendor Brand');
    });
  });
});