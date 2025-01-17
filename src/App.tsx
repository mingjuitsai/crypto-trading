import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { formatEther, formatUnits } from "viem";
import { useCryptoPriceWebSocket } from "./useCryptoPriceWebSocket";
import { PositionCard, Position } from "./PositionCard";
import { getPositionPnL } from "./getPositionPnL";

// Main App Component
function App() {
  // Market Data
  const prices = useCryptoPriceWebSocket(["btcusdt", "ethusdt", "solusdt"]);

  // Trading State
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [pendingPositionSize, setPendingPositionSize] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [virtualUSDTBalance, setVirtualUSDTBalance] = useState<number>(10000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [totalLocked, setTotalLocked] = useState<number>(0);

  // UI State
  const [isUpdating, setIsUpdating] = useState(false);
  const positionsRef = useRef(positions);

  // Wallet Connection
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ethBalance } = useBalance({
    address,
  });

  const { data: usdtBalance } = useBalance({
    address,
    token: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT contract address on mainnet
  });

  // Initialize virtual and initial balance from wallet
  // Add initial test USDT balance
  useEffect(() => {
    if (isConnected && initialBalance === 0) {
      const testBalance = 10000; // Give 10,000 USDT for testing
      setVirtualUSDTBalance(testBalance);
      setInitialBalance(testBalance);
    }
  }, [isConnected, initialBalance]);

  // Update positions ref
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const openPosition = async (type: "LONG" | "SHORT") => {
    if (!isConnected || isUpdating || pendingPositionSize === 0) return;

    const size = Number(pendingPositionSize);
    const availableBalance = virtualUSDTBalance - totalLocked;

    if (size > availableBalance) {
      alert("Insufficient available balance");
      return;
    }

    setIsUpdating(true);

    try {
      const currentPrice =
        prices.find((c) => c.symbol === selectedSymbol)?.price || 0;
      const newPosition: Position = {
        id: Date.now().toString(),
        symbol: selectedSymbol,
        type,
        size: pendingPositionSize,
        entryPrice: currentPrice,
        timestamp: Date.now(),
      };

      setPositions((prev) => [...prev, newPosition]);
      setTotalLocked((prev) => prev + size);
      setPendingPositionSize(0);
    } catch (error) {
      console.error("Error opening position:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const closePosition = async (positionId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const position = positionsRef.current.find((p) => p.id === positionId);
      if (!position) return;

      const pnl = Number(getPositionPnL(prices, position));
      setVirtualUSDTBalance((prev) => prev + pnl);
      setTotalLocked((prev) => prev - Number(position.size));
      setPositions((prev) => prev.filter((p) => p.id !== positionId));
    } catch (error) {
      console.error("Error closing position:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate available balance
  const availableBalance = virtualUSDTBalance - totalLocked;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6 h-[calc(100vh-4rem)]">
        {/* Market Prices Panel */}
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col">
          <h2 className="text-xl font-bold mb-4">Market Prices</h2>
          <div className="space-y-4 mb-6">
            {prices.map((crypto) => (
              <div
                key={crypto.symbol}
                className={`p-3 rounded cursor-pointer ${
                  selectedSymbol === crypto.symbol
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50"
                }`}
                onClick={() => setSelectedSymbol(crypto.symbol)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{crypto.symbol}/USDT</span>
                  <span className="text-lg">${crypto.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            {/* Existing Position Size Input */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position Size
            </label>
            <div className="relative">
              <input
                type="number"
                value={pendingPositionSize}
                onChange={(e) => {
                  const value = e.target.value;
                  if (Number(value) <= availableBalance) {
                    setPendingPositionSize(+value);
                  }
                }}
                className="w-full p-2 pr-16 border rounded focus:ring-2 focus:ring-blue-500"
                step="100"
                min="100"
                max={availableBalance}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500">USDT</span>
              </div>
            </div>

            {/* Percentage Slider */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>0%</span>
                <span>
                  {(
                    (Number(pendingPositionSize) / availableBalance) *
                    100
                  ).toFixed(0)}
                  %
                </span>
                <span>100%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={(Number(pendingPositionSize) / availableBalance) * 100}
                onChange={(e) => {
                  const percentage = Number(e.target.value);
                  const newSize = (
                    (percentage * availableBalance) /
                    100
                  ).toFixed(2);
                  setPendingPositionSize(+newSize);
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500">
                  Available: {availableBalance.toFixed(2)} USDT
                </span>
                <button
                  onClick={() => setPendingPositionSize(availableBalance)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Max
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => openPosition("LONG")}
              disabled={isUpdating || !isConnected || pendingPositionSize === 0}
              className="p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isUpdating ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Long"
              )}
            </button>
            <button
              onClick={() => openPosition("SHORT")}
              disabled={isUpdating || !isConnected || pendingPositionSize === 0}
              className="p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isUpdating ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Short"
              )}
            </button>
          </div>
        </div>

        {/* Positions Panel */}
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col h-[calc(100vh-4rem)]">
          <h2 className="text-xl font-bold mb-4">Open Positions</h2>
          {positions.length > 0 ? (
            <div className="space-y-4 overflow-auto flex-1 pr-2">
              {positions.map((position) => {
                return (
                  <PositionCard
                    prices={prices}
                    key={position.id}
                    position={position}
                    isUpdating={isUpdating}
                    onClosePostion={closePosition}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No open positions</p>
          )}
        </div>

        {/* Wallet Panel */}
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col h-[calc(100vh-4rem)]">
          <h2 className="text-xl font-bold mb-6">Wallet Info</h2>

          {isConnected ? (
            <div className="space-y-6">
              {/* Wallet Details */}
              <div className="bg-gray-50 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">
                    Wallet Details
                  </h3>
                  <button
                    onClick={() => disconnect()}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Disconnect
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Address</p>
                    <p className="font-mono text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Balance</p>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {ethBalance &&
                          Number(formatEther(ethBalance.value)).toFixed(4)}{" "}
                        ETH
                      </p>
                      <p className="text-sm font-medium">
                        {usdtBalance
                          ? Number(formatUnits(usdtBalance.value, 6)).toFixed(2)
                          : "0.00"}{" "}
                        USDT
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Virtual Trading */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-700 mb-4">
                  Virtual Trading
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      Current Balance
                    </p>
                    <p className="text-lg font-semibold">
                      {virtualUSDTBalance.toFixed(2)} USDT
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Locked</p>
                      <p className="font-medium">
                        {totalLocked.toFixed(2)} USDT
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Available</p>
                      <p className="font-medium">
                        {availableBalance.toFixed(2)} USDT
                      </p>
                    </div>
                  </div>

                  {/* P/L Card */}
                  <div className="mt-4 rounded-md border border-gray-200 p-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-500">
                        Session P/L
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          virtualUSDTBalance - initialBalance >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {(virtualUSDTBalance - initialBalance).toFixed(2)} USDT
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
