import { baseSepolia } from "viem/chains";

// ── Sözleşme Adresi ───────────────────────────────────────────
// Mainnet deploy sonrası bu adresi güncelle
export const CONTRACT_ADDRESS = "0x83d71de9b2018fe668c112af03d810756e0a359f" as `0x${string}`;

// ── Admin Panel Ek Yetkili Cüzdanlar ─────────────────────────
// Owner dışında admin panele READ-ONLY erişmesini istediğin cüzdanları buraya ekle.
// (lowercase olmalı — contract `onlyOwner` hâlâ geçerli, TX atmaya çalışırsa revert olur)
export const EXTRA_ADMIN_WALLETS: string[] = [
  // "0xTEST_WALLET_ADRESIN_BURAYA",
];

// ── Ağ ────────────────────────────────────────────────────────
export const CHAIN = baseSepolia;

// ── Fiyatlar (wei) ────────────────────────────────────────────
export const MINT_PRICE            = BigInt("2200000000000000"); // 0.0022 ETH
export const TICKET_PRICE          = BigInt("1800000000000000"); // 0.0018 ETH

// ── Early-Bird İndirimi (v7) ──────────────────────────────────
export const EARLY_BIRD_SUPPLY     = 5;                         // indirimli slot sayısı (test: 10, mainnet: 200)
export const EARLY_BIRD_DISC_BPS   = 2000;                       // %20 indirim
/// Discounted price = MINT_PRICE × (10000 - 2000) / 10000 = 0.00176 ETH
export const DISC_MINT_PRICE       = BigInt("1760000000000000"); // 0.00176 ETH

/// @dev Aynı calcMintCost mantığını contract ile birebir aynı uygular.
///      `totalMinted` = contract'tan okunan `totalNFTsMinted` değeri.
export function calcMintCost(amount: number, totalMinted: number): bigint {
  if (totalMinted >= EARLY_BIRD_SUPPLY) {
    return MINT_PRICE * BigInt(amount);
  }
  const remaining = EARLY_BIRD_SUPPLY - totalMinted;
  if (amount <= remaining) {
    return DISC_MINT_PRICE * BigInt(amount);
  }
  // Sınırı aşan batch: kısmen indirimli + kısmen tam fiyat
  return DISC_MINT_PRICE * BigInt(remaining) + MINT_PRICE * BigInt(amount - remaining);
}

// ── Limitler ──────────────────────────────────────────────────
export const MAX_MINT_PER_WALLET = 10;

// ── Gol Kralı Adayları ────────────────────────────────────────
// Güncellenme: Mayıs 2026 — FIFA resmi görüntü adları, bahis oranlarına göre sıralanmış (Top 50)
export const TOP_SCORER_PLAYERS = [
  { name: "Kylian Mbappé",       country: "France",       flag: "fr"     },
  { name: "Harry Kane",           country: "England",      flag: "gb-eng" },
  { name: "Lionel Messi",         country: "Argentina",    flag: "ar"     },
  { name: "Erling Haaland",       country: "Norway",       flag: "no"     },
  { name: "Lamine Yamal",         country: "Spain",        flag: "es"     },
  { name: "Mikel Oyarzabal",      country: "Spain",        flag: "es"     },
  { name: "Cristiano Ronaldo",    country: "Portugal",     flag: "pt"     },
  { name: "Vinicius Junior",      country: "Brazil",       flag: "br"     },
  { name: "Lautaro Martínez",     country: "Argentina",    flag: "ar"     },
  { name: "Ousmane Dembélé",      country: "France",       flag: "fr"     },
  { name: "Romelu Lukaku",        country: "Belgium",      flag: "be"     },
  { name: "Raphinha",             country: "Brazil",       flag: "br"     },
  { name: "Julián Álvarez",       country: "Argentina",    flag: "ar"     },
  { name: "Álvaro Morata",        country: "Spain",        flag: "es"     },
  { name: "Cody Gakpo",           country: "Netherlands",  flag: "nl"     },
  { name: "Bukayo Saka",          country: "England",      flag: "gb-eng" },
  { name: "Jude Bellingham",      country: "England",      flag: "gb-eng" },
  { name: "Florian Wirtz",        country: "Germany",      flag: "de"     },
  { name: "Kai Havertz",          country: "Germany",      flag: "de"     },
  { name: "Jean-Philippe Mateta", country: "France",       flag: "fr"     },
  { name: "Gonçalo Ramos",        country: "Portugal",     flag: "pt"     },
  { name: "Nick Woltemade",       country: "Germany",      flag: "de"     },
  { name: "Marcus Thuram",        country: "France",       flag: "fr"     },
  { name: "Neymar Jr",            country: "Brazil",       flag: "br"     },
  { name: "Bruno Fernandes",      country: "Portugal",     flag: "pt"     },
  { name: "Luis Díaz",            country: "Colombia",     flag: "co"     },
  { name: "Désiré Doué",          country: "France",       flag: "fr"     },
  { name: "Mohamed Salah",        country: "Egypt",        flag: "eg"     },
  { name: "Dani Olmo",            country: "Spain",        flag: "es"     },
  { name: "Memphis Depay",        country: "Netherlands",  flag: "nl"     },
  { name: "Ferran Torres",        country: "Spain",        flag: "es"     },
  { name: "Viktor Gyökeres",      country: "Sweden",       flag: "se"     },
  { name: "Igor Thiago",          country: "Brazil",       flag: "br"     },
  { name: "Deniz Undav",          country: "Germany",      flag: "de"     },
  { name: "Jamal Musiala",        country: "Germany",      flag: "de"     },
  { name: "Loïs Openda",          country: "Belgium",      flag: "be"     },
  { name: "Santiago Giménez",     country: "Mexico",       flag: "mx"     },
  { name: "Darwin Núñez",         country: "Uruguay",      flag: "uy"     },
  { name: "Eberechi Eze",         country: "England",      flag: "gb-eng" },
  { name: "Matheus Cunha",        country: "Brazil",       flag: "br"     },
  { name: "Alexander Sørloth",    country: "Norway",       flag: "no"     },
  { name: "Marcus Rashford",      country: "England",      flag: "gb-eng" },
  { name: "Morgan Rogers",        country: "England",      flag: "gb-eng" },
  { name: "Nico Williams",        country: "Spain",        flag: "es"     },
  { name: "Folarin Balogun",      country: "USA",          flag: "us"     },
  { name: "Christian Pulisic",    country: "USA",          flag: "us"     },
  { name: "Jonathan David",       country: "Canada",       flag: "ca"     },
  { name: "Enner Valencia",       country: "Ecuador",      flag: "ec"     },
  { name: "Leandro Trossard",     country: "Belgium",      flag: "be"     },
  { name: "Mikel Merino",         country: "Spain",        flag: "es"     },
];

// ── Yardımcı ──────────────────────────────────────────────────
export function formatEth(wei: bigint, decimals = 4): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
