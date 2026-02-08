// Crypto price service - fetches real-time prices
// In production, integrate with CoinGecko, CoinMarketCap, or Binance API

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
}

// Simulated prices - In production, fetch from real API
const BASE_PRICES: Record<string, { name: string; basePrice: number; icon: string }> = {
  BTC: { name: 'Bitcoin', basePrice: 67500, icon: '₿' },
  ETH: { name: 'Ethereum', basePrice: 3450, icon: 'Ξ' },
  USDT: { name: 'Tether', basePrice: 1.00, icon: '₮' },
  USDC: { name: 'USD Coin', basePrice: 1.00, icon: '$' },
  BNB: { name: 'Binance Coin', basePrice: 595, icon: 'B' },
  XRP: { name: 'Ripple', basePrice: 0.52, icon: 'X' },
  SOL: { name: 'Solana', basePrice: 145, icon: 'S' },
  ADA: { name: 'Cardano', basePrice: 0.45, icon: 'A' },
};

// Add slight randomization to simulate market movement
function getVariation(): number {
  return 1 + (Math.random() - 0.5) * 0.02; // ±1% variation
}

export async function getCryptoPrices(): Promise<CryptoPrice[]> {
  // In production, fetch from real API:
  // const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,...&vs_currencies=usd&include_24hr_change=true');
  
  return Object.entries(BASE_PRICES).map(([symbol, data]) => ({
    symbol,
    name: data.name,
    price: data.basePrice * getVariation(),
    change24h: (Math.random() - 0.5) * 10, // Random -5% to +5%
    icon: data.icon,
  }));
}

export async function getCryptoPrice(symbol: string): Promise<number> {
  const crypto = BASE_PRICES[symbol.toUpperCase()];
  if (!crypto) throw new Error(`Unsupported cryptocurrency: ${symbol}`);
  return crypto.basePrice * getVariation();
}

export function convertUsdToCrypto(usdAmount: number, cryptoPrice: number): number {
  return usdAmount / cryptoPrice;
}

export function convertCryptoToUsd(cryptoAmount: number, cryptoPrice: number): number {
  return cryptoAmount * cryptoPrice;
}

export const SUPPORTED_CRYPTOS = Object.keys(BASE_PRICES);

export const NETWORK_OPTIONS: Record<string, string[]> = {
  BTC: ['Bitcoin Network'],
  ETH: ['ERC20', 'Arbitrum', 'Optimism'],
  USDT: ['ERC20', 'TRC20', 'BEP20'],
  USDC: ['ERC20', 'TRC20', 'BEP20', 'Solana'],
  BNB: ['BEP20', 'BEP2'],
  XRP: ['Ripple Network'],
  SOL: ['Solana Network'],
  ADA: ['Cardano Network'],
};
