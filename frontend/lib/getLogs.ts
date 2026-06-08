/**
 * Chunked getLogs utility.
 *
 * Public RPC nodes (e.g., https://sepolia.base.org) limit eth_getLogs to
 * roughly 2 000–10 000 blocks per call. This helper splits a large range into
 * CHUNK-sized windows and fetches them in batches of BATCH concurrent requests.
 */

const CHUNK = 9_999n; // blocks per call — safe for most public RPCs
const BATCH = 5;      // concurrent calls per round

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLogsChunked(
  client: { getLogs: (p: any) => Promise<any[]> },
  params: Record<string, unknown>,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<any[]> {
  if (fromBlock > toBlock) return [];

  // Build all block-range windows
  const ranges: { from: bigint; to: bigint }[] = [];
  for (let f = fromBlock; f <= toBlock; f += CHUNK + 1n) {
    ranges.push({ from: f, to: f + CHUNK > toBlock ? toBlock : f + CHUNK });
  }

  // Fetch in sequential batches of BATCH concurrent requests
  const all: any[] = [];
  for (let i = 0; i < ranges.length; i += BATCH) {
    const slice = ranges.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(({ from, to }) =>
        client.getLogs({ ...params, fromBlock: from, toBlock: to })
      )
    );
    all.push(...results.flat());
  }
  return all;
}
