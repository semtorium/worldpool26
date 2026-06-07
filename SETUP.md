# WorldPool26 — Geliştirme Ortamı Kurulum

## 1. WSL2'de Foundry Kur

WSL2 Ubuntu terminalini aç ve sırayla çalıştır:

```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

Doğrula:
```bash
forge --version   # forge 0.2.x
cast --version
anvil --version
```

---

## 2. Projeyi WSL'den Aç

Windows'taki AbsWorldPool klasörüne WSL'den ulaş:

```bash
cd /mnt/c/Users/semto/OneDrive/Masaüstü/absworldpool/AbsWorldPool
```

---

## 3. OpenZeppelin Bağımlılığını Yükle

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

---

## 4. Testleri Çalıştır

```bash
# Tüm testler
forge test -vvv

# Sadece belirli bir test
forge test --match-test test_claim_nationsCup_twoHolders_proRata -vvvv

# Fuzz testleri dahil
forge test --fuzz-runs 500 -vvv

# Gas raporu
forge test --gas-report
```

Beklenen çıktı: tüm testler yeşil ✓

---

## 5. .env Dosyasını Hazırla

```bash
cp .env.example .env
# .env dosyasını düzenle:
nano .env
```

Doldurulacaklar:
- `PRIVATE_KEY` — testnet cüzdanının private key'i
- `DEV_WALLET` — senin cüzdan adresin (geliştirici kesintisi alacak)
- `BASE_URI` — Pinata'ya yükleme yaptıktan sonra doldurulacak

---

## 6. Testnet Deploy

```bash
source .env

forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvvv
```

Deploy sonrası ownership'i Gnosis Safe'e devret:

```bash
cast send <DEPLOY_ADRESI> \
  "transferOwnership(address)" <GNOSIS_SAFE_ADRESI> \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia.base.org
```

---

## Klasör Yapısı

```
AbsWorldPool/
├── src/
│   └── WorldPool26.sol       ← Ana sözleşme
├── test/
│   └── WorldPool26.t.sol     ← Test suite (30+ test)
├── script/
│   └── Deploy.s.sol          ← Deploy scripti
├── lib/                      ← forge install sonrası oluşur
├── foundry.toml
├── .env.example
└── .gitignore
```
