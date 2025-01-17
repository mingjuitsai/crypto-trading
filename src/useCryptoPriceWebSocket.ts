import { useEffect, useRef, useState } from "react";

export type CryptoPrice = {
  symbol: string;
  price: number;
};

export function useCryptoPriceWebSocket(symbols: string[]) {
  const ws = useRef<WebSocket | null>(null);
  const [prices, setPrices] = useState<CryptoPrice[]>([
    { symbol: "BTC", price: 0 },
    { symbol: "ETH", price: 0 },
    { symbol: "SOL", price: 0 },
  ]);

  useEffect(() => {
    const connectWebSocket = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }

      ws.current = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbols.join("@trade/")}@trade`
      );

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const symbol = data.s.replace("USDT", "");

        setPrices((prev) =>
          prev.map((crypto) =>
            crypto.symbol === symbol
              ? { ...crypto, price: parseFloat(data.p) }
              : crypto
          )
        );
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        reconnect();
      };

      ws.current.onclose = () => {
        console.log("WebSocket closed. Reconnecting...");
        reconnect();
      };
    };

    const reconnect = () => {
      setTimeout(connectWebSocket, 3000);
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [symbols]);

  return prices;
}
