import WebSocket from 'ws';

export async function testWebSocket(url: string, timeoutMs = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`WebSocket handshake timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const ws = new WebSocket(url);

    ws.on('open', () => {
      clearTimeout(timer);
      const latency = Date.now() - start;
      ws.close();
      resolve(latency);
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
