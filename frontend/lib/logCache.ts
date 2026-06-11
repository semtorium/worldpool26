"use client";

import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { CONTRACT_ADDRESS } from "./config";

const DEPLOY_BLOCK = 47128622n;
const CHUNK_SIZE   = 20000n;

// Dedicated client that bypasses the wagmi fallback chain (which tries Alchemy first).
// Alchemy free tier limits eth_getLogs to 10-block ranges; publicnode supports 2000+.
const LOG_CLIENT = createPublicClient({
  chain: base,
  transport: http("https://base-rpc.publicnode.com"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLog = any;

interface CacheEntry {
  logs: AnyLog[];
  lastBlock: bigint;
}

const cache   = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<AnyLog[]>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function doFetchChunks(_client: unknown, params: any, fromBlock: bigint, toBlock: bigint): Promise<AnyLog[]> {
  const ranges: { from: bigint; to: bigint }[] = [];
  for (let from = fromBlock; from <= toBlock; from += CHUNK_SIZE) {
    const to = from + CHUNK_SIZE - 1n < toBlock ? from + CHUNK_SIZE - 1n : toBlock;
    ranges.push({ from, to });
  }
  if (ranges.length === 0) return [];
  // Fetch in batches of 6 to avoid rate limits
  const BATCH = 6;
  const all: AnyLog[] = [];
  for (let i = 0; i < ranges.length; i += BATCH) {
    const batch = ranges.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(r => LOG_CLIENT.getLogs({ ...params, fromBlock: r.from, toBlock: r.to }))
    );
    all.push(...results.flat());
  }
  return all;
}

/**
 * Fetches logs for an event, using an in-memory cache.
 * - First call: fetches all blocks since deploy (heavy, one-time).
 * - Subsequent calls: fetches only new blocks since last fetch (cheap).
 * - Duplicate in-flight calls for the same key are deduplicated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchLogsWithCache(client: any, eventSig: string, extraArgs?: Record<string, unknown>): Promise<AnyLog[]> {
  const key = extraArgs ? `${eventSig}::${JSON.stringify(extraArgs)}` : eventSig;

  // Deduplicate concurrent requests for the same key
  const existing = inFlight.get(key);
  if (existing) return existing;

  const entry = cache.get(key) ?? { logs: [], lastBlock: DEPLOY_BLOCK - 1n };

  const promise = (async () => {
    const currentBlock = (await LOG_CLIENT.getBlockNumber()) as bigint;
    if (entry.lastBlock >= currentBlock) return entry.logs;

    const params: Record<string, unknown> = {
      address: CONTRACT_ADDRESS,
      event: parseAbiItem(eventSig),
    };
    if (extraArgs) params.args = extraArgs;

    const fromBlock = entry.lastBlock + 1n;
    const newLogs = await doFetchChunks(client, params, fromBlock, currentBlock);
    const allLogs = [...entry.logs, ...newLogs];
    cache.set(key, { logs: allLogs, lastBlock: currentBlock });
    return allLogs;
  })();

  inFlight.set(key, promise);
  promise.finally(() => inFlight.delete(key));
  return promise;
}
