# Abstract Testnet Deploy Rehberi

## 1. Testnet Cüzdanı Hazırla

MetaMask veya Rabby'de yeni bir cüzdan oluştur (asla mainnet cüzdanını kullanma).
Private key'ini kopyala.

Abstract Testnet'i ekle:
- Network Name: Abstract Testnet
- RPC URL: https://api.testnet.abs.xyz
- Chain ID: 11124
- Symbol: ETH
- Explorer: https://explorer.testnet.abs.xyz

## 2. Testnet ETH Al

https://faucet.abs.xyz adresine git, cüzdan adresini gir.

## 3. .env Dosyasını Doldur

```bash
cd /mnt/c/Users/semto/OneDrive/Masaüstü/absworldpool/AbsWorldPool
cp .env.example .env
nano .env
```

```env
PRIVATE_KEY=0x...          # Testnet cüzdan private key
DEV_WALLET=0x...           # Senin cüzdan adresin (geliştirici kesintisi alacak)
BASE_URI=https://flagcdn.com/w640/   # Geçici — Pinata hazır olunca güncellenecek
ETHERSCAN_API_KEY=          # Şimdilik boş bırak
```

## 4. Deploy Et

```bash
source .env

forge script script/Deploy.s.sol \
  --rpc-url https://api.testnet.abs.xyz \
  --broadcast \
  -vvvv
```

Deploy sonrası terminalde sözleşme adresi görünecek. Onu kaydet.

## 5. Gnosis Safe Kur (Abstract Testnet)

1. https://safe.global adresine git
2. "Create new Safe" → Abstract Testnet seç
3. Owner olarak testnet cüzdan adresini ekle
4. Safe adresini kaydet

## 6. Ownership'i Gnosis Safe'e Devret

```bash
cast send <SOZLESME_ADRESI> \
  "transferOwnership(address)" <GNOSIS_SAFE_ADRESI> \
  --private-key $PRIVATE_KEY \
  --rpc-url https://api.testnet.abs.xyz
```

## 7. Sözleşmeyi Explorer'da Doğrula

```bash
forge verify-contract <SOZLESME_ADRESI> \
  src/ABSWorldPool.sol:ABSWorldPool \
  --rpc-url https://api.testnet.abs.xyz \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.abs.xyz/api
```

## 8. Test Et

Explorer'da sözleşmeyi aç → "Write Contract" sekmesinden:
- mintCountryNFT(1, 1) — 0.0022 ETH ile
- buyScorerTickets(1) — 0.0018 ETH ile
- voteTopScorer("Mbappe", 1)

## Sonraki Adım: Metadata Güncelleme

Pinata'ya görseller yüklendiğinde:

```bash
cast send <SOZLESME_ADRESI> \
  "setBaseURI(string)" "https://gateway.pinata.cloud/ipfs/QmXXXX/" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://api.testnet.abs.xyz
```

---

## Gelir Özeti (Sözleşmeye Kayıtlı)

| İşlem | Oran | Alıcı |
|-------|------|-------|
| NFT Mint | %20 | devWallet (anında) |
| Gol Kralı Bileti | %20 | devWallet (anında) |
| Şampiyonluk havuzu | %5 | devWallet (finale'de) |
| Gol Kralı havuzu | %5 | devWallet (finale'de) |
| OpenSea secondary | %5 | devWallet (EIP-2981) |
