import { CryptoPrice } from "./useCryptoPriceWebSocket";
import { getPositionPnL } from "./getPositionPnL";

export type Position = {
  id: string;
  symbol: string;
  type: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  timestamp: number;
};

export function PositionCard({
  prices,
  position,
  isUpdating,
  onClosePostion,
}: {
  prices: CryptoPrice[];
  position: Position;
  isUpdating: boolean;
  onClosePostion: (positionId: Position["id"]) => void;
}) {
  const pnl = getPositionPnL(prices, position);
  const currentPrice = prices.find((c) => c.symbol === position.symbol)?.price;
  const isProfitable = Number(pnl) >= 0;

  return (
    <div key={position.id} className="p-4 bg-gray-50 rounded border">
      <div className="flex justify-between items-start mb-2">
        <p className="font-medium">{position.symbol}/USDT</p>
        <span
          className={`px-2 py-1 rounded text-sm ${
            position.type === "LONG"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {position.type}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm">Size: {position.size} USDT</p>
        <p className="text-sm text-gray-600">
          Entry: ${position.entryPrice.toFixed(2)}
        </p>
        <p className="text-sm text-gray-600">
          Current: {currentPrice ? `$${currentPrice.toFixed(2)}` : "0"}
        </p>
        <p
          className={`text-sm font-bold ${
            isProfitable ? "text-green-500" : "text-red-500"
          }`}
        >
          P/L: {pnl.toFixed(2)} USDT
        </p>
      </div>

      <button
        onClick={() => onClosePostion(position.id)}
        disabled={isUpdating}
        className="w-full mt-3 p-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isUpdating ? "Closing..." : "Close Position"}
      </button>
    </div>
  );
}
