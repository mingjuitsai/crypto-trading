import { CryptoPrice } from "./useCryptoPriceWebSocket";
import { Position } from "./PositionCard";

export const getPositionPnL = (prices: CryptoPrice[], position: Position) => {
  // Calculate the quantity of crypto bought with the USDT position size
  const cryptoQuantity = position.size / position.entryPrice;
  const currentPrice =
    prices.find((c) => c.symbol === position.symbol)?.price || 0;

  // Calculate P/L: (current_price - entry_price) * crypto_quantity
  const pnl =
    position.type === "LONG"
      ? (currentPrice - position.entryPrice) * cryptoQuantity
      : -(currentPrice - position.entryPrice) * cryptoQuantity;

  return +pnl.toFixed(2);
};
