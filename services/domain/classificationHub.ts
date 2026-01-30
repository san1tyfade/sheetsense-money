import React from 'react';
import { Asset } from '../../types';
import { Wallet, Home, Car, Package, Coins, CircleDollarSign, Briefcase, Landmark, CreditCard } from 'lucide-react';

export enum AssetMajorClass {
  CASH = 'CASH',
  INVESTMENT = 'INVESTMENT',
  FIXED = 'FIXED',
  LIABILITY = 'LIABILITY'
}

/**
 * Global Authority on Financial Identity Tokens.
 */
const IDENTITY_TOKENS = {
    TFSA: ['TFSA', 'TAX FREE SAVINGS'],
    RRSP: ['RRSP', 'RSP', 'RETIREMENT SAVINGS'],
    FHSA: ['FHSA', 'FIRST HOME SAVINGS'],
    LAPP: ['LAPP', 'PENSION PLAN'],
    RESP: ['RESP', 'EDUCATION SAVINGS']
};

/**
 * Resolves the logical asset type based on name tokens.
 */
export const resolveAssetType = (name: string, currentType: string = 'Other'): string => {
    const n = (name || '').toUpperCase();
    if (IDENTITY_TOKENS.TFSA.some(t => n.includes(t))) return 'TFSA';
    if (IDENTITY_TOKENS.RRSP.some(t => n.includes(t))) return 'RRSP';
    if (IDENTITY_TOKENS.FHSA.some(t => n.includes(t))) return 'FHSA';
    if (IDENTITY_TOKENS.LAPP.some(t => n.includes(t))) return 'LAPP';
    if (IDENTITY_TOKENS.RESP.some(t => n.includes(t))) return 'RESP';
    return currentType;
};

export const MANAGED_ACCOUNT_TOKENS = [
  ...IDENTITY_TOKENS.TFSA, ...IDENTITY_TOKENS.RRSP, ...IDENTITY_TOKENS.FHSA,
  'LIRA', '401K', 'CRYPTO', 'BITCOIN', 'ETH', 'SOLANA', 'PORTFOLIO', 
  'DIGITAL ASSET', 'WEALTHSIMPLE', 'QUESTRADE', 'COINBASE', 'BINANCE'
];

export const CRYPTO_TICKERS = [
    'BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'LTC', 'AVAX', 'LINK', 
    'MATIC', 'USDT', 'USDC', 'BNB', 'SHIB', 'TRX', 'UNI', 'ATOM', 'XMR', 
    'ETC', 'BCH', 'FIL', 'NEAR', 'ALGO', 'ICP', 'VET', 'SAND', 'MANA', 
    'AAVE', 'EOS', 'HBAR', 'PEPE', 'RNDR', 'STX', 'GRT', 'MKR', 'OP', 'ARB'
];

const PATTERNS = {
  INVESTMENT: ['investment', 'stock', 'etf', 'retirement', 'pension', 'tfsa', 'fhsa', 'rrsp', 'lira', 'lapp', 'resp', '401k', 'crypto', 'portfolio', 'trading', 'holding', 'wealthsimple', 'questrade'],
  FIXED: ['real estate', 'property', 'house', 'vehicle', 'car', 'condo', 'land', 'mortgage', 'auto', 'home', 'residence', 'apartment', 'townhouse'],
  CASH: ['cash', 'bank', 'savings', 'checking', 'chequing', 'uninvested', 'wallet', 'emergency', 'hisa', 'liquid', 'current account', 'checking account'],
  LIABILITY: ['debt', 'loan', 'credit card', 'visa', 'mastercard', 'amex', 'line of credit', 'loc', 'payable', 'liability', 'balance due', 'owing']
};

const CASH_TICKERS = ['CASH.TO', 'PSA.TO', 'HSAV.TO', 'CSAV.TO', 'NSAV.TO', 'MNY.TO', 'CASH', 'USD', 'CAD'];

export const isTickerCashEquivalent = (ticker: string): boolean => {
    const t = (ticker || '').toUpperCase().trim();
    return CASH_TICKERS.includes(t);
};

export const getAssetMajorClass = (asset: Asset): AssetMajorClass => {
  const name = (asset.name || '').toLowerCase();
  const type = (asset.type || '').toLowerCase();
  const combined = `${name} ${type}`;

  if (asset.value < 0 || PATTERNS.LIABILITY.some(p => combined.includes(p))) return AssetMajorClass.LIABILITY;
  if (PATTERNS.CASH.some(p => combined.includes(p))) return AssetMajorClass.CASH;
  if (PATTERNS.INVESTMENT.some(p => combined.includes(p))) return AssetMajorClass.INVESTMENT;
  if (PATTERNS.FIXED.some(p => combined.includes(p))) return AssetMajorClass.FIXED;
  return AssetMajorClass.CASH; 
};

export const isCryptoAsset = (ticker: string, assetClass?: string, accountName?: string): boolean => {
    const t = (ticker || '').toUpperCase().trim();
    const cls = (assetClass || '').toUpperCase();
    const acc = (accountName || '').toUpperCase();
    return CRYPTO_TICKERS.includes(t) || t.includes('-USD') || t.includes('-CAD') || cls.includes('CRYPTO') || cls.includes('COIN') || acc.includes('CRYPTO') || acc.includes('COINBASE') || acc.includes('BINANCE');
};

export const isAssetManagedByLiveFeed = (asset: Asset): boolean => {
    if (asset.isManaged) return true;
    const majorClass = getAssetMajorClass(asset);
    if (majorClass !== AssetMajorClass.INVESTMENT) return false;
    const name = (asset.name || '').toUpperCase().trim();
    const type = (asset.type || '').toUpperCase().trim();
    return MANAGED_ACCOUNT_TOKENS.some(token => name === token || type === token || name.includes(` ${token}`) || name.startsWith(`${token} `) || name.includes(`(${token})`));
};

export const isInvestment = (asset: Asset) => getAssetMajorClass(asset) === AssetMajorClass.INVESTMENT;
export const isCash = (asset: Asset) => getAssetMajorClass(asset) === AssetMajorClass.CASH;
export const isFixed = (asset: Asset) => getAssetMajorClass(asset) === AssetMajorClass.FIXED;
export const isLiability = (asset: Asset) => getAssetMajorClass(asset) === AssetMajorClass.LIABILITY;

export const getAssetIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('credit card') || t.includes('visa') || t.includes('amex') || t.includes('debt')) return React.createElement(CreditCard, { className: "text-rose-400" });
  if (t.includes('cash') || t.includes('bank') || t.includes('chequing') || t.includes('savings')) return React.createElement(Wallet, { className: "text-emerald-400" });
  if (t.includes('real estate') || t.includes('property') || t.includes('house') || t.includes('home')) return React.createElement(Home, { className: "text-blue-400" });
  if (t.includes('vehicle') || t.includes('car')) return React.createElement(Car, { className: "text-indigo-400" });
  if (t.includes('crypto')) return React.createElement(Coins, { className: "text-orange-400" });
  if (t.includes('stock') || t.includes('etf') || t.includes('investment')) return React.createElement(CircleDollarSign, { className: "text-purple-400" });
  return React.createElement(Landmark, { className: "text-slate-400" });
};