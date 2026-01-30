import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../../types";
import { getMerchantMemory, batchSaveMerchantMemory, getMerchantIdentities, batchSaveMerchantIdentities } from "../tools/toolMemoryService";
import { AppError, IEP } from "./ErrorHandler";

/**
 * Strategy 1: Deterministic Cleaning (Regex/String Stripping)
 * Aggressively cleans merchant descriptions to remove numbers, codes, locations, and dates.
 */
export const cleanMerchantDescription = (desc: string): string => {
  if (!desc) return '';
  
  // Normalize whitespace first to ensure subsequent regexes match correctly
  let clean = desc.toUpperCase().replace(/\s+/g, ' ').trim();

  return clean
    // 1. Remove hashtags and following digits (e.g., #345)
    .replace(/#\s?\d+/g, '')
    // 2. Remove long numeric-heavy sequences (likely store IDs or sequence codes)
    // We require at least 5 digits to avoid nuking words like "MERCHANT" (8 letters)
    .replace(/\b[A-Z0-9]*[0-9]{5,}[A-Z0-9]*\b/g, '')
    // 3. Remove common location suffixes and street identifiers
    .replace(/\b(STREET|AVE|AVENUE|ROAD|RD|BOULEVARD|BLVD|NORTH|SOUTH|EAST|WEST|NORTHHILL|SOUTHHILL|BENTALL)\b/g, '')
    // 4. Remove phone number patterns
    .replace(/\d{3}-\d{3}-\d{4}/g, '')
    // 5. Remove date patterns often found in descriptions
    .replace(/\d{2}[-/]\d{2}([-/]\d{2,4})?/g, '')
    // 6. Remove leading transaction numbers
    .replace(/^\d+\s/, '')
    // 7. Remove common junk keywords
    .replace(/\b(STORE|SHOP|SQ|MARKET|CA|USA|CAN)\b/g, '')
    // 8. Remove common merchant decorators/special chars
    .replace(/[*#]/g, '')
    .replace(/[.]/g, ' ')
    // 9. Final whitespace collapse and trim
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Strategy 2 & 3: Neural Normalization & Local Identity Memory
 * Orchestrates intelligent transaction classification and merchant canonicalization.
 */
export const intelligentCategorize = async (
  transactions: Transaction[],
  targetCategories: string[],
  model: string = 'gemini-3-flash-preview'
): Promise<Transaction[]> => {
  if (transactions.length === 0) return transactions;

  // Strategy 3: Check local identity memory and general merchant memory
  const memory = await getMerchantMemory();
  const identityMatrix = await getMerchantIdentities();
  const unknownMerchants = new Set<string>();
  
  const mapped = transactions.map(tx => {
    const merchantRaw = (tx.description || 'Unknown').trim();
    const cleanMerchant = cleanMerchantDescription(merchantRaw);
    
    // Check for explicit user mapping (Original -> Canonical)
    const userCanonical = identityMatrix[merchantRaw.toUpperCase()];
    
    // Check for category memory (by raw or cleaned name)
    const knownCat = memory[merchantRaw.toUpperCase()] || memory[userCanonical || cleanMerchant];

    if (knownCat) {
      return { 
        ...tx, 
        category: knownCat, 
        canonicalName: userCanonical || cleanMerchant,
        isNew: false 
      };
    }
    unknownMerchants.add(merchantRaw);
    return { ...tx, isNew: true };
  });

  if (unknownMerchants.size === 0) return mapped;

  // Strategy 2: Neural Reasoning (Gemini)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const uniqueUnknowns = Array.from(unknownMerchants);

  const systemInstruction = `
    You are an expert financial auditor. Your task is to analyze transaction descriptions.
    For each description, provide:
    1. A 'category' from the provided target list.
    2. A 'canonicalName' which is the clean, high-level brand identity (e.g., 'Walmart' for 'WALMART #123', 'Uber' for 'UBER *TRIP').
    Output ONLY valid JSON in an array of objects format.
  `;

  const prompt = `Data to classify (Descriptions):\n${uniqueUnknowns.join('\n')}\n\nTarget Categories:\n${targetCategories.join(', ')}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              canonicalName: { type: Type.STRING }
            },
            required: ["description", "category", "canonicalName"]
          }
        }
      },
    });

    let aiResults: any[] = [];
    try {
        aiResults = JSON.parse(response.text || '[]');
    } catch (parseErr) {
        throw new AppError(IEP.INT.SCHEMA_MISMATCH, "Neural output malformation.", 'RECOVERABLE', parseErr);
    }

    const finalizedCategoryMappings: Record<string, string> = {};
    const finalizedIdentityMappings: Record<string, string> = {};

    aiResults.forEach((item: any) => {
      if (item.description && item.category) {
        const rawKey = item.description.toUpperCase().trim();
        finalizedCategoryMappings[rawKey] = item.category;
        finalizedIdentityMappings[rawKey] = item.canonicalName;
      }
    });

    // Save newly learned categories and identities to local IndexedDB
    if (Object.keys(finalizedCategoryMappings).length > 0) {
        await batchSaveMerchantMemory(finalizedCategoryMappings);
    }
    if (Object.keys(finalizedIdentityMappings).length > 0) {
        await batchSaveMerchantIdentities(finalizedIdentityMappings);
    }

    return mapped.map(tx => {
      if (!tx.isNew) return tx;
      const normalized = tx.description.toUpperCase().trim();
      const aiCat = finalizedCategoryMappings[normalized];
      const aiCanonical = finalizedIdentityMappings[normalized];
      
      return { 
        ...tx, 
        category: aiCat || tx.category, 
        canonicalName: aiCanonical || cleanMerchantDescription(tx.description),
        isNew: false, 
        isAiResolved: !!aiCat 
      };
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    // Ensure we extract a message string from the error object
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError(IEP.INT.MODEL_TIMEOUT, `Neural Categorization Fault: ${msg}`, 'RECOVERABLE', error);
  }
};

/**
 * Phase 2 Migration: Neural Narrative Synthesis
 * Generates a natural language brief for a financial node.
 */
export const generateAuditNarrative = async (
    title: string,
    merchantStats: any[],
    anomalies: any[]
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const context = `
        Category: ${title}
        Key Merchants: ${merchantStats.map(m => `${m.identity} (Total: $${m.l12mTotal.toFixed(0)})`).join(', ')}
        Recent Anomalies: ${anomalies.map(a => `${a.type} event of ${a.variance.toFixed(0)}% deviation`).join(', ')}
    `;

    const prompt = `
        You are a principal financial strategist. Analyze the provided context for the spending category "${title}".
        Provide exactly two sentences of high-density analysis.
        Sentence 1: Analyze stability and volume patterns.
        Sentence 2: Flag specific anomalies or optimization opportunities.
        Strict Rules: No pleasantries. complete sentences only.
        Context: ${context}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: 0.4, topP: 0.8, maxOutputTokens: 250, thinkingConfig: { thinkingBudget: 100 } }
        });
        
        const result = response.text?.trim() || "";
        if (result.length < 15) return "Current trajectory reflects a standard baseline. Allocation remains consistent.";
        return result;
    } catch (error) {
        return "Intelligence engine temporarily offline. Proceeding with raw statistical audit.";
    }
};