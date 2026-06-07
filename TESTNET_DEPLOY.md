# Base Sepolia Testnet Deploy Rehberi

## 1. Testnet Cüzdanı Hazırla

MetaMask veya Rabby'de yeni bir cüzdan oluştur (asla mainnet cüzdanını kullanma).
Private key'ini kopyala.

Base Sepolia Testnet'i ekle:
- Network Name: Base Sepolia
- RPC URL: https://sepolia.base.org
- Chain ID: 84532
- Symbol: ETH
- Explorer: https://sepolia.basescan.org

## 2. Testnet ETH Al

https://www.coinbase.com/faucets/base-ethereum-goerli-faucet adresine git, veya
https://faucet.quicknode.com/base/sepolia cüzdan adresini gir.

## 3. .env Dosyasını Doldur

```bash
cd /mnt/c/Users/semto/OneDrive/Masaüstü/absworldpool/AbsWorldPool
cp .env.example .env
nano .env
```

```env
PRIVATE_KEY=0x...          # Testnet cüzdan private key
DEV_WALLET=0x...           # Senin cüzdan adresin (geliştirici kesintisi alacak)
BASE_URI=ipfs://bafybei.../   # IPFS CID + trailing slash
BASESCAN_API_KEY=           # https://basescan.org/myapikey
```

## 4. Deploy Et

```bash
source .env

forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvvv
```

Deploy sonrası terminalde sözleşme adresi görünecek. Onu kaydet.
`frontend/lib/config.ts` içindeki `CONTRACT_ADDRESS`'i güncelle.

## 5. Sözleşmeyi Doğrula (Otomatik)

`--verify` flag'i deploy sırasında zaten Basescan'e gönderiyor.
Manuel doğrulama gerekirse:

```bash
forge verify-contract <SOZLESME_ADRESI> \
  src/WorldPool26.sol:WorldPool26 \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY
```

## 6. Test Et

Explorer'da sözleşmeyi aç → "Write Contract" sekmesinden:
- mintCountryNFT(1, 1) — 0.0022 ETH ile
- buyScorerTickets(1) — 0.0018 ETH ile
- voteTopScorer("Mbappe", 1)

## 7. Metadata Güncelleme

Pinata'ya görseller yüklendiğinde:

```bash
cast send <SOZLESME_ADRESI> \
  "setBaseURI(string)" "ipfs://<CID>/" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia.base.org
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
