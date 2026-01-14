import { MarketSession } from './types';

const CURRENCY_PAIRS = {
  Asian: ['USD/JPY', 'AUD/JPY', 'NZD/JPY', 'AUD/USD', 'NZD/USD'],
  London: ['EUR/USD', 'GBP/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'],
  'New York': ['USD/CAD', 'EUR/USD', 'GBP/USD', 'USD/CHF', 'AUD/USD']
};

interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

class MarketSimulator {
  private prices: Map<string, PriceData[]> = new Map();
  private trends: Map<string, 'up' | 'down' | 'neutral'> = new Map();

  constructor() {
    CURRENCY_PAIRS.Asian.concat(CURRENCY_PAIRS.London).concat(CURRENCY_PAIRS['New York']).forEach(pair => {
      this.prices.set(pair, this.generateInitialPrices(pair));
      this.trends.set(pair, 'neutral');
    });
  }

  private generateInitialPrices(pair: string): PriceData[] {
    const prices: PriceData[] = [];
    let basePrice = this.getBasePrice(pair);
    const now = Date.now();

    for (let i = 50; i >= 0; i--) {
      const timestamp = now - (i * 5 * 60 * 1000);
      const volatility = 0.0005 * basePrice;
      const trend = Math.sin(i / 10) * volatility;
      const noise = (Math.random() - 0.5) * volatility * 2;

      const open = basePrice;
      const close = basePrice + trend + noise;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;

      prices.push({ timestamp, open, high, low, close });
      basePrice = close;
    }

    return prices;
  }

  private getBasePrice(pair: string): number {
    const prices: Record<string, number> = {
      'USD/JPY': 145.5,
      'AUD/JPY': 99.2,
      'NZD/JPY': 94.8,
      'AUD/USD': 0.68,
      'NZD/USD': 0.65,
      'EUR/USD': 1.09,
      'GBP/USD': 1.27,
      'EUR/GBP': 0.86,
      'EUR/JPY': 158.5,
      'GBP/JPY': 184.2,
      'USD/CAD': 1.35,
      'USD/CHF': 0.88,
    };
    return prices[pair] || 1.0;
  }

  updatePrices(): void {
    const now = Date.now();
    CURRENCY_PAIRS.Asian.concat(CURRENCY_PAIRS.London).concat(CURRENCY_PAIRS['New York']).forEach(pair => {
      const history = this.prices.get(pair) || [];
      const lastPrice = history[history.length - 1];

      const trend = this.trends.get(pair) || 'neutral';
      const trendStrength = trend === 'up' ? 0.0005 : trend === 'down' ? -0.0005 : 0;

      const volatility = 0.0008 * lastPrice.close;
      const noise = (Math.random() - 0.5) * volatility;
      const momentum = trendStrength * lastPrice.close;

      const open = lastPrice.close;
      const close = lastPrice.close + momentum + noise;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;

      history.push({ timestamp: now, open, high, low, close });

      if (history.length > 60) {
        history.shift();
      }

      if (Math.random() > 0.85) {
        const trendOptions: Array<'up' | 'down' | 'neutral'> = ['up', 'down', 'neutral'];
        this.trends.set(pair, trendOptions[Math.floor(Math.random() * trendOptions.length)]);
      }

      this.prices.set(pair, history);
    });
  }

  getPriceHistory(pair: string, periods: number = 20): PriceData[] {
    const history = this.prices.get(pair) || [];
    return history.slice(-periods);
  }
}

const simulator = new MarketSimulator();

function calculateRSI(prices: PriceData[], period: number = 14): number {
  const closes = prices.map(p => p.close);
  const changes = [];

  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const gains = changes.filter(c => c > 0).slice(-period);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c)).slice(-period);

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b) / period : 0;

  if (avgLoss === 0) return avgGain > 0 ? 100 : 0;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

function calculateMACD(prices: PriceData[]): { macd: number; signal: number; histogram: number } {
  const closes = prices.map(p => p.close);

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;

  const macdValues = [];
  for (let i = 0; i < closes.length; i++) {
    const e12 = calculateEMA(closes.slice(0, i + 1), 12);
    const e26 = calculateEMA(closes.slice(0, i + 1), 26);
    macdValues.push(e12 - e26);
  }

  const signal = calculateEMA(macdValues, 9);
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;

  const multiplier = 2 / (period + 1);
  let ema = values[0];

  for (let i = 1; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

function calculateMovingAverages(prices: PriceData[]): { sma20: number; sma50: number; ema9: number } {
  const closes = prices.map(p => p.close);

  const sma20 = closes.slice(-20).reduce((a, b) => a + b) / 20;
  const sma50 = closes.slice(-50).reduce((a, b) => a + b) / Math.min(50, closes.length);
  const ema9 = calculateEMA(closes, 9);

  return { sma20, sma50, ema9 };
}

function calculateStochastic(prices: PriceData[], period: number = 14): { k: number; d: number } {
  const recent = prices.slice(-period);
  let high = recent[0].high, low = recent[0].low;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].high > high) high = recent[i].high;
    if (recent[i].low < low) low = recent[i].low;
  }

  const current = recent[recent.length - 1].close;
  const k = high === low ? 50 : ((current - low) / (high - low)) * 100;
  const d = (k + (prices.length > 1 ? k : 0) + (prices.length > 2 ? k : 0)) / 3;

  return { k, d };
}

function calculateBollingerBands(prices: PriceData[], period: number = 20): { upper: number; middle: number; lower: number } {
  const closes = prices.map(p => p.close);
  const lastCloses = closes.slice(-period);

  const middle = lastCloses.reduce((a, b) => a + b) / period;
  const variance = lastCloses.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + (stdDev * 2),
    middle,
    lower: middle - (stdDev * 2)
  };
}

function calculateATR(prices: PriceData[], period: number = 14): number {
  let sum = 0, count = 0;

  for (let i = Math.max(1, prices.length - period); i < prices.length; i++) {
    const current = prices[i];
    const previous = prices[i - 1];

    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);

    sum += Math.max(tr1, tr2, tr3);
    count++;
  }

  return count > 0 ? sum / count : 0;
}

function detectSupportResistance(prices: PriceData[]): { support: number; resistance: number } {
  const highs = prices.map(p => p.high);
  const lows = prices.map(p => p.low);

  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  return { support, resistance };
}

export function getCurrentSession(): MarketSession {
  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 0 && hour < 8) {
    return { name: 'Asian', active: true, pairs: CURRENCY_PAIRS.Asian };
  } else if (hour >= 8 && hour < 16) {
    return { name: 'London', active: true, pairs: CURRENCY_PAIRS.London };
  } else {
    return { name: 'New York', active: true, pairs: CURRENCY_PAIRS['New York'] };
  }
}

export function getNextFiveMinuteInterval(): { start: Date; end: Date } {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  const minutesToAdd = 5 - (minutes % 5);
  const nextInterval = new Date(now);

  if (minutesToAdd === 5 && seconds === 0 && milliseconds === 0) {
    nextInterval.setMinutes(minutes);
  } else {
    nextInterval.setMinutes(minutes + minutesToAdd);
  }

  nextInterval.setSeconds(0);
  nextInterval.setMilliseconds(0);

  const endInterval = new Date(nextInterval);
  endInterval.setMinutes(nextInterval.getMinutes() + 5);

  return { start: nextInterval, end: endInterval };
}

export function analyzePattern(pair: string): { action: 'BUY' | 'SELL'; confidence: number } {
  simulator.updatePrices();

  const priceHistory = simulator.getPriceHistory(pair, 50);
  if (priceHistory.length < 30) {
    return { action: 'BUY', confidence: 0 };
  }

  const rsi = calculateRSI(priceHistory);
  const { macd, signal, histogram } = calculateMACD(priceHistory);
  const { sma20, sma50, ema9 } = calculateMovingAverages(priceHistory);
  const { k: stoch_k, d: stoch_d } = calculateStochastic(priceHistory);
  const { upper, middle, lower } = calculateBollingerBands(priceHistory);
  const atr = calculateATR(priceHistory);
  const { support, resistance } = detectSupportResistance(priceHistory);

  const currentPrice = priceHistory[priceHistory.length - 1].close;
  const lastPrice = priceHistory[priceHistory.length - 2].close;
  const priceChange = ((currentPrice - lastPrice) / lastPrice) * 100;

  const recentClose = priceHistory.slice(-5).map(p => p.close);
  const isConsecutiveGain = recentClose[0] < recentClose[1] && recentClose[1] < recentClose[2];
  const isConsecutiveLoss = recentClose[0] > recentClose[1] && recentClose[1] > recentClose[2];

  let bullishSignals = 0;
  let bearishSignals = 0;
  let totalSignals = 0;

  if (rsi < 35) bullishSignals += 1.5;
  else if (rsi < 50) bullishSignals += 0.8;
  else if (rsi > 65) bearishSignals += 1.5;
  else if (rsi > 50) bearishSignals += 0.8;
  totalSignals += 1.5;

  const histogramStrength = Math.abs(histogram);
  if (histogram > 0 && macd > signal) {
    bullishSignals += 1 + (histogramStrength > 0.01 ? 0.5 : 0);
  } else if (histogram < 0 && macd < signal) {
    bearishSignals += 1 + (histogramStrength > 0.01 ? 0.5 : 0);
  }
  totalSignals += 1.5;

  if (currentPrice > sma20 && sma20 > sma50) bullishSignals += 1.2;
  else if (currentPrice > sma20 && currentPrice > sma50) bullishSignals += 0.8;
  else if (currentPrice < sma20 && sma20 < sma50) bearishSignals += 1.2;
  else if (currentPrice < sma20 && currentPrice < sma50) bearishSignals += 0.8;
  totalSignals += 1.2;

  const distToEma = Math.abs(currentPrice - ema9) / ema9;
  if (currentPrice > ema9 && distToEma < 0.01) bullishSignals += 1;
  else if (currentPrice > ema9) bullishSignals += 0.6;
  else if (currentPrice < ema9 && distToEma < 0.01) bearishSignals += 1;
  else if (currentPrice < ema9) bearishSignals += 0.6;
  totalSignals += 1;

  if (isConsecutiveGain && currentPrice > support) bullishSignals += 1.5;
  else if (isConsecutiveLoss && currentPrice < resistance) bearishSignals += 1.5;
  totalSignals += 1.5;

  if (stoch_k < 20) bullishSignals += 1.2;
  else if (stoch_k < 35) bullishSignals += 0.6;
  else if (stoch_k > 80) bearishSignals += 1.2;
  else if (stoch_k > 65) bearishSignals += 0.6;

  if (stoch_k > stoch_d) bullishSignals += 0.7;
  else bearishSignals += 0.7;
  totalSignals += 1.9;

  const bandPosition = (currentPrice - lower) / (upper - lower);
  if (currentPrice < lower) bullishSignals += 1.3;
  else if (bandPosition < 0.2) bullishSignals += 0.8;
  else if (currentPrice > upper) bearishSignals += 1.3;
  else if (bandPosition > 0.8) bearishSignals += 0.8;

  if (currentPrice > middle && bandPosition > 0.4) bullishSignals += 0.6;
  else if (currentPrice < middle && bandPosition < 0.6) bearishSignals += 0.6;
  totalSignals += 2;

  const recentHigh = Math.max(...priceHistory.slice(-5).map(p => p.high));
  const recentLow = Math.min(...priceHistory.slice(-5).map(p => p.low));
  const volatility = recentHigh - recentLow;
  const volatilityRatio = atr / (volatility || 0.001);

  if (volatilityRatio > 1) bullishSignals += 0.4;
  else bearishSignals += 0.4;
  totalSignals += 0.4;

  if (priceChange > 0.05 && rsi < 70) bullishSignals += 0.8;
  if (priceChange < -0.05 && rsi > 30) bearishSignals += 0.8;
  totalSignals += 0.8;

  const bullishPercentage = (bullishSignals / totalSignals) * 100;
  const action = bullishSignals > bearishSignals ? 'BUY' : 'SELL';

  const confirmationStrength = Math.abs(bullishSignals - bearishSignals);
  const baseConfidence = bullishPercentage;
  const confidence = Math.round(baseConfidence * (confirmationStrength / totalSignals) * 2.1);

  return { action, confidence: Math.min(99, Math.max(52, confidence)) };
}

function analyzeMultiTimeframe(pair: string): number {
  const shortTerm = simulator.getPriceHistory(pair, 20);
  if (shortTerm.length < 10) return 0;

  const short_rsi = calculateRSI(shortTerm);
  const short_trend = shortTerm[shortTerm.length - 1].close > shortTerm[0].close ? 1 : -1;
  const short_momentum = (shortTerm[shortTerm.length - 1].close - shortTerm[0].close) / shortTerm[0].close;

  const allPrices = simulator.getPriceHistory(pair, 50);
  const medium_rsi = calculateRSI(allPrices);
  const medium_trend = allPrices[allPrices.length - 1].close > allPrices[0].close ? 1 : -1;
  const medium_momentum = (allPrices[allPrices.length - 1].close - allPrices[0].close) / allPrices[0].close;

  let mtfScore = 0;

  if (short_trend === medium_trend) {
    mtfScore += 1.2;
  } else {
    mtfScore += 0.1;
  }

  if (Math.abs(short_momentum) > 0.01) {
    mtfScore += 0.4;
  }

  if (Math.abs(medium_momentum) > 0.02) {
    mtfScore += 0.4;
  }

  if (Math.abs(short_rsi - medium_rsi) > 20) {
    mtfScore += 0.2;
  } else if (Math.abs(short_rsi - medium_rsi) < 5) {
    mtfScore += 0.3;
  }

  return Math.min(1.2, mtfScore);
}

export function generateSignal(thresholdOverride?: number) {
  const session = getCurrentSession();
  const pairs = session.pairs;

  let threshold = thresholdOverride ?? 75;
  if (thresholdOverride === undefined) {
    const savedSettings = localStorage.getItem('tradingSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      threshold = settings.confidenceThreshold ?? 75;
    }
  }

  let attempts = 0;
  const maxAttempts = 20;
  let bestSignal = null;
  let bestConfidence = 0;

  while (attempts < maxAttempts) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const { action, confidence } = analyzePattern(pair);

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      const mtf = analyzeMultiTimeframe(pair);
      const finalConfidence = Math.min(99, Math.round(confidence + (mtf * 5)));

      bestSignal = {
        pair,
        action,
        confidence: finalConfidence,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        session: session.name
      };

      if (finalConfidence >= threshold) {
        return bestSignal;
      }
    }

    attempts++;
  }

  return null;
}

export function getTimeUntilNextInterval(): number {
  const now = new Date();
  const { start } = getNextFiveMinuteInterval();
  return start.getTime() - now.getTime();
}
