/**
 * faqContent.ts
 *
 * FAQ question & answer content translated into all 6 supported languages.
 * Structural elements (title, badge, section headers) are in i18n.ts.
 * This file holds the longer Q&A strings to keep i18n.ts lean.
 */

import type { Lang } from "@/lib/i18n";

export interface FaqItem { q: string; a: string }
export interface FaqSection { titleKey: string; emoji: string; color: string; items: FaqItem[] }

const faqData: Record<Lang, FaqSection[]> = {
  en: [
    {
      titleKey: "faq_sec_about", emoji: "🌍", color: "#0052FF",
      items: [
        {
          q: "What is WorldPool26?",
          a: "WorldPool26 is a Web3 prediction platform built on Base for the 2026 FIFA World Cup. It has two games: the Nations Cup, where you mint country NFTs and win if your country becomes champion, and Top Scorer, where you vote for the player you think will score the most goals. Both pools are funded by participants and paid out to winners automatically via smart contract.",
        },
        {
          q: "Which blockchain does it run on?",
          a: "WorldPool26 runs on Base, an EVM-compatible Ethereum Layer 2 blockchain built by Coinbase. Transactions are fast, cheap, and settled on Ethereum. You can connect with any standard EVM wallet — MetaMask, Coinbase Wallet, Rabby, or any injected wallet.",
        },
        {
          q: "Is WorldPool26 safe to use?",
          a: "The smart contract is deployed on-chain and all logic is transparent and verifiable. Prize pools are locked in the contract and can only be distributed by the finalization functions. No one — including the dev — can withdraw the prize pools before the tournament ends. The contract does include a dev fee (20% on each mint/ticket goes to dev wallet instantly; 5% fee at settlement) which is disclosed upfront.",
        },
        {
          q: "Is this gambling?",
          a: "WorldPool26 is designed as an entertainment platform for football fans — not a gambling service. You're minting digital collectibles (NFTs) and voting on a real-world sporting event. That said, there is a financial element: you spend ETH and may or may not receive a return. Participate only with what you're comfortable losing.",
        },
      ],
    },
    {
      titleKey: "faq_sec_nc", emoji: "🏆", color: "#fbbf24",
      items: [
        {
          q: "How does the Nations Cup work?",
          a: "Each of the 48 countries competing in the 2026 World Cup has its own NFT on the platform. You mint NFTs for whichever countries you believe will go far. When the tournament ends, all holders of the winning country's NFT split 95% of the total Nations Cup prize pool — proportional to how many NFTs they hold versus the total supply of that country.\n\nExample: If France wins and 1,000 France NFTs exist, and you hold 5 of them, you receive 0.5% of the prize pool.",
        },
        {
          q: "Is there a limit to how many NFTs I can mint?",
          a: "No. There is no per-wallet mint limit. You can mint as many NFTs as you like for any country. The system is pro-rata — the more you hold relative to total supply, the bigger your share. But since anyone else can also mint more, the percentage is not fixed until the tournament ends.",
        },
        {
          q: "What happens when a country gets eliminated?",
          a: "When a country is eliminated, the NFT card shows an 'Eliminated' badge. However, the main prize pool is ONE pool — eliminations do not redistribute funds. The entire pool accumulates throughout the tournament and only flows to the champion's NFT holders at the end.",
        },
        {
          q: "How is my Nations Cup payout calculated?",
          a: "Your reward = (your NFTs of winning country ÷ total supply of winning country) × 95% of total Nations Cup pool.\n\nThe 95% is the winner share — 5% is a protocol fee taken at settlement. The dev also takes 20% of each mint upfront (before it enters the pool), so the pool you see is already after that deduction.",
        },
        {
          q: "When can I claim my Nations Cup reward?",
          a: "You can claim immediately after the tournament is finalized on-chain. A winner modal will appear on your next visit if you hold winning NFTs. Unclaimed rewards remain in the contract for 30 days — after that the owner can withdraw them. Make sure to claim within 30 days of the tournament ending.",
        },
        {
          q: "Can I trade my country NFTs?",
          a: "Yes. Country NFTs are standard ERC-1155 tokens and will be visible on OpenSea (Base is supported). After the tournament starts and minting closes, you can buy and sell them on secondary markets. The value of a country's NFT typically rises as it advances in the tournament.",
        },
      ],
    },
    {
      titleKey: "faq_sec_ts", emoji: "⚽", color: "#2563EB",
      items: [
        {
          q: "How does the Top Scorer pool work?",
          a: "You buy voting tickets (0.0018 ETH each). Each ticket gives you 1 vote. You vote for the player you think will be the tournament's top scorer. When the tournament ends and the top scorer is announced on-chain, everyone who voted for the correct player splits 95% of the Top Scorer prize pool — proportional to how many votes they cast for the winner.",
        },
        {
          q: "Can I split my votes across multiple players?",
          a: "Yes. Each ticket equals one vote and you can vote for different players in separate transactions. If you have 10 tickets, you could cast 7 votes for Mbappé and 3 for Haaland across two separate vote transactions.",
        },
        {
          q: "What if I buy tickets but never vote?",
          a: "After the Top Scorer is finalized, if you have unused (unvoted) tickets, you can call refundUnusedTickets() and get back 80% of what you paid per unused ticket. The 20% dev fee is non-refundable since it was taken at purchase.",
        },
        {
          q: "What if no one voted for the actual top scorer?",
          a: "If the winning player has zero votes, no one can claim rewards. The prize pool sits in the contract for 30 days, after which the owner can withdraw it. The contract owner can also finalize with any string — including a write-in name not on the default list.",
        },
        {
          q: "How is my Top Scorer payout calculated?",
          a: "Your reward = (your votes for winner ÷ total votes for winner) × 95% of Top Scorer pool at finalization.\n\nNote: the pool at finalization excludes the ETH reserved for unused ticket refunds, so only the 'active' portion is distributed.",
        },
      ],
    },
    {
      titleKey: "faq_sec_fees", emoji: "💰", color: "#0052FF",
      items: [
        {
          q: "How much does it cost?",
          a: "🌍 Country NFT mint: 0.0022 ETH each\n🎟️ Top Scorer ticket: 0.0018 ETH each\nPlus a small Base gas fee (typically under $0.01) per transaction.",
        },
        {
          q: "Where does the fee go?",
          a: "At purchase: 80% goes into the prize pool, 20% goes instantly to the dev wallet.\n\nAt settlement: 95% of the pool goes to winners, 5% is a protocol fee to the dev.\n\nThis structure funds ongoing development and keeps the platform running for future tournaments.",
        },
        {
          q: "What happens to unclaimed prizes?",
          a: "If a winner does not claim within 30 days after finalization, the owner can call withdrawUnclaimedNationsCup() or withdrawUnclaimedTopScorer() to recover those funds. Always claim your rewards within 30 days of the tournament ending.",
        },
      ],
    },
    {
      titleKey: "faq_sec_wallet", emoji: "🔗", color: "#2563EB",
      items: [
        {
          q: "Which wallet do I need?",
          a: "Any standard EVM wallet works — MetaMask, Coinbase Wallet, Rabby, or any injected wallet. Simply click 'Connect Wallet' and approve the connection.",
        },
        {
          q: "I connected my wallet but nothing is happening. What do I do?",
          a: "Make sure you're on the Base network. The app will attempt to switch networks automatically. If it doesn't, add Base manually in your wallet settings: RPC URL https://mainnet.base.org, Chain ID 8453, symbol ETH.",
        },
        {
          q: "What happens to the NFTs after the tournament ends?",
          a: "NFTs remain on-chain forever as collectibles. After the tournament, country cards display a 'Trade on OpenSea' button so you can list or sell them on secondary markets. Winning country NFTs may carry historical value as World Cup memorabilia.",
        },
        {
          q: "Is the contract open source?",
          a: "The frontend is fully open source on GitHub (github.com/semtorium/worldpool26). The smart contract is verified on Basescan, making all logic publicly readable and auditable.",
        },
      ],
    },
  ],

  tr: [
    {
      titleKey: "faq_sec_about", emoji: "🌍", color: "#0052FF",
      items: [
        {
          q: "WorldPool26 nedir?",
          a: "WorldPool26, 2026 FIFA Dünya Kupası için Base üzerine kurulmuş bir Web3 tahmin platformudur. İki oyun içerir: Milletler Kupası, ülke NFT'leri mintleyerek ülkeniz şampiyon olduğunda kazanırsınız; Gol Kralı, en çok gol atacağını düşündüğünüz oyuncuya oy verirsiniz. Her iki havuz da katılımcılar tarafından finanse edilir ve kazananlara akıllı kontrat aracılığıyla otomatik olarak ödenir.",
        },
        {
          q: "Hangi blockchain üzerinde çalışıyor?",
          a: "WorldPool26, Coinbase tarafından geliştirilen EVM uyumlu bir Ethereum Layer 2 blockchain'i olan Base üzerinde çalışır. İşlemler hızlı, ucuz ve Ethereum'da kesinleşir. MetaMask, Coinbase Wallet, Rabby veya herhangi bir EVM cüzdanı ile bağlanabilirsiniz.",
        },
        {
          q: "WorldPool26 kullanmak güvenli mi?",
          a: "Akıllı kontrat zincirde yayınlanmıştır ve tüm mantık şeffaf ve doğrulanabilirdir. Ödül havuzları kontratta kilitlidir ve yalnızca sonlandırma fonksiyonları tarafından dağıtılabilir. Turnuva sona ermeden önce kimse — geliştirici dahil — ödül havuzlarını çekemez. Kontrat, geliştirici ücreti içermektedir (her mint/biletin %20'si anında geliştirici cüzdanına; sonuçlanmada %5 ücret), bu açıkça belirtilmiştir.",
        },
        {
          q: "Bu kumar mı?",
          a: "WorldPool26, futbol taraftarları için bir eğlence platformu olarak tasarlanmıştır — kumar hizmeti değil. Dijital koleksiyon (NFT) mintliyorsunuz ve gerçek dünya spor etkinliğine oy veriyorsunuz. Bununla birlikte, finansal bir unsur mevcuttur: ETH harcıyorsunuz ve geri dönüş alabilir ya da almayabilirsiniz. Kaybetmeyi göze aldığınız kadarıyla katılın.",
        },
      ],
    },
    {
      titleKey: "faq_sec_nc", emoji: "🏆", color: "#fbbf24",
      items: [
        {
          q: "Milletler Kupası nasıl çalışır?",
          a: "2026 Dünya Kupası'nda yarışan 48 ülkenin her birinin platformda kendi NFT'si bulunur. İlerleyeceğine inandığınız ülkeler için NFT mintlersiniz. Turnuva sona erdiğinde, kazanan ülkenin NFT'sini tutan herkes, toplam Milletler Kupası ödül havuzunun %95'ini paylaşır — ellerindeki NFT sayısının o ülkenin toplam arzına oranına göre.\n\nÖrnek: Fransa kazanırsa ve 1.000 Fransa NFT'si varsa, 5 tanesine sahipseniz ödül havuzunun %0,5'ini alırsınız.",
        },
        {
          q: "Mintleyebileceğim NFT sayısında bir sınır var mı?",
          a: "Hayır. Cüzdan başına mint sınırı yoktur. Herhangi bir ülke için istediğiniz kadar NFT mintleyebilirsiniz. Sistem orantısal çalışır — toplam arza kıyasla ne kadar çok tutarsanız payınız o kadar büyür. Ancak başkaları da daha fazla mintleyebileceğinden yüzde, turnuva sona erene kadar sabit değildir.",
        },
        {
          q: "Bir ülke elendiğinde ne olur?",
          a: "Bir ülke elendiğinde NFT kartında 'Elendi' rozeti görünür. Ancak ana ödül havuzu TEK bir havuzdur — elemeler fonları yeniden dağıtmaz. Tüm havuz turnuva boyunca birikir ve yalnızca şampiyonun NFT sahiplerine sonunda aktarılır.",
        },
        {
          q: "Milletler Kupası ödeme hesabım nasıl yapılır?",
          a: "Ödülünüz = (kazanan ülkedeki NFT'leriniz ÷ kazanan ülkenin toplam arzı) × Milletler Kupası havuzunun %95'i.\n\n%95 kazanan payıdır — %5 sonuçlanmada alınan protokol ücretidir. Geliştirici ayrıca her mintten peşin olarak %20 alır (havuza girmeden önce), bu nedenle gördüğünüz havuz bu kesintiden sonraki miktardır.",
        },
        {
          q: "Milletler Kupası ödülümü ne zaman alabilirim?",
          a: "Turnuva zincirde sonuçlandırıldıktan hemen sonra talep edebilirsiniz. Kazanan NFT'leriniz varsa bir sonraki ziyaretinizde kazanan modalı görünecektir. Talep edilmeyen ödüller 30 gün boyunca kontratta kalır — sonrasında sahibi bunları çekebilir. Turnuva bittikten sonra 30 gün içinde mutlaka ödülünüzü alın.",
        },
        {
          q: "Ülke NFT'lerimi satabilir miyim?",
          a: "Evet. Ülke NFT'leri standart ERC-1155 tokenlardır ve OpenSea'de görünür olacaktır (Base desteklenmektedir). Turnuva başladıktan ve mint kapandıktan sonra ikincil piyasalarda alıp satabilirsiniz. Bir ülkenin NFT değeri genellikle turnuvada ilerledikçe artar.",
        },
      ],
    },
    {
      titleKey: "faq_sec_ts", emoji: "⚽", color: "#2563EB",
      items: [
        {
          q: "Gol Kralı havuzu nasıl çalışır?",
          a: "Oy biletleri satın alırsınız (her biri 0,0018 ETH). Her bilet 1 oy hakkı verir. Turnuvanın gol kralı olacağını düşündüğünüz oyuncuya oy verirsiniz. Turnuva sona erip gol kralı zincirde açıklandığında, doğru oyuncuya oy veren herkes Gol Kralı ödül havuzunun %95'ini paylaşır — kazanana verdikleri oy sayısına oranla.",
        },
        {
          q: "Oylarımı birden fazla oyuncuya bölebilir miyim?",
          a: "Evet. Her bilet bir oya eşittir ve ayrı işlemlerle farklı oyunculara oy verebilirsiniz. 10 biletin varsa 7'sini Mbappé'ye, 3'ünü Haaland'a iki ayrı işlemde kullanabilirsiniz.",
        },
        {
          q: "Bilet satın alıp hiç oy kullanmazsam ne olur?",
          a: "Gol Kralı sonuçlandırıldıktan sonra kullanılmamış biletleriniz varsa refundUnusedTickets() fonksiyonunu çağırarak kullanılmamış bilet başına ödediğinizin %80'ini geri alabilirsiniz. %20 geliştirici ücreti satın almada alındığından iade edilmez.",
        },
        {
          q: "Gerçek gol kralna hiç oy verilmezse ne olur?",
          a: "Kazanan oyuncunun sıfır oyu varsa kimse ödül alamaz. Ödül havuzu 30 gün kontratta kalır, sonrasında sahibi çekebilir. Kontrat sahibi aynı zamanda varsayılan listede olmayan bir isimle de sonuçlandırabilir.",
        },
        {
          q: "Gol Kralı ödemem nasıl hesaplanır?",
          a: "Ödülünüz = (kazanana verdiğiniz oylar ÷ kazanana verilen toplam oy) × sonuçlanmadaki Gol Kralı havuzunun %95'i.\n\nNot: Sonuçlanmadaki havuz, kullanılmamış bilet iadeleri için ayrılan ETH'yi hariç tutar.",
        },
      ],
    },
    {
      titleKey: "faq_sec_fees", emoji: "💰", color: "#0052FF",
      items: [
        {
          q: "Maliyet nedir?",
          a: "🌍 Ülke NFT mint: her biri 0,0022 ETH\n🎟️ Gol Kralı bileti: her biri 0,0018 ETH\nAyrıca işlem başına küçük bir Base gas ücreti (genellikle 0,01 doların altında).",
        },
        {
          q: "Ücret nereye gidiyor?",
          a: "Satın almada: %80 ödül havuzuna, %20 anında geliştirici cüzdanına gider.\n\nSonuçlanmada: Havuzun %95'i kazananlara, %5 protokol ücreti olarak geliştiriciye gider.\n\nBu yapı süregelen geliştirmeyi finanse eder ve platformun gelecekteki turnuvalarda da çalışmasını sağlar.",
        },
        {
          q: "Talep edilmeyen ödüllere ne olur?",
          a: "Bir kazanan sonuçlanmadan itibaren 30 gün içinde talep etmezse, sahibi withdrawUnclaimedNationsCup() veya withdrawUnclaimedTopScorer() fonksiyonlarını çağırarak bu fonları geri alabilir. Ödülünüzü turnuva bittikten sonra mutlaka 30 gün içinde talep edin.",
        },
      ],
    },
    {
      titleKey: "faq_sec_wallet", emoji: "🔗", color: "#2563EB",
      items: [
        {
          q: "Hangi cüzdana ihtiyacım var?",
          a: "Herhangi bir standart EVM cüzdanı çalışır — MetaMask, Coinbase Wallet, Rabby veya herhangi bir injected cüzdan. 'Cüzdan Bağla'ya tıklayıp bağlantıyı onaylamanız yeterlidir.",
        },
        {
          q: "Cüzdanımı bağladım ama hiçbir şey olmuyor. Ne yapmalıyım?",
          a: "Base ağında olduğunuzdan emin olun. Uygulama ağları otomatik olarak değiştirmeye çalışacaktır. Olmazsa cüzdan ayarlarınızda Base'i manuel olarak ekleyin: RPC URL https://mainnet.base.org, Chain ID 8453, sembol ETH.",
        },
        {
          q: "Turnuva bittikten sonra NFT'lere ne olur?",
          a: "NFT'ler koleksiyon olarak sonsuza kadar zincirde kalır. Turnuva sonrasında ülke kartlarında 'OpenSea'de Al/Sat' butonu görünür, böylece ikincil piyasalarda listeleyebilir veya satabilirsiniz. Kazanan ülke NFT'leri Dünya Kupası hatırası olarak tarihi değer taşıyabilir.",
        },
        {
          q: "Kontrat açık kaynak mı?",
          a: "Frontend tamamen GitHub'da açık kaynak olarak mevcuttur (github.com/semtorium/worldpool26). Akıllı kontrat Basescan'da doğrulanmıştır, bu da tüm mantığın herkes tarafından okunabilir ve denetlenebilir olduğu anlamına gelir.",
        },
      ],
    },
  ],

  es: [
    {
      titleKey: "faq_sec_about", emoji: "🌍", color: "#0052FF",
      items: [
        {
          q: "¿Qué es WorldPool26?",
          a: "WorldPool26 es una plataforma de predicciones Web3 construida en Base para la Copa del Mundo FIFA 2026. Tiene dos juegos: la Copa de Naciones, donde minteas NFTs de países y ganas si tu país se convierte en campeón, y el Máximo Goleador, donde votas por el jugador que crees que marcará más goles. Ambos fondos son financiados por participantes y pagados automáticamente a los ganadores a través de un contrato inteligente.",
        },
        {
          q: "¿En qué blockchain funciona?",
          a: "WorldPool26 funciona en Base, una blockchain Ethereum Layer 2 compatible con EVM construida por Coinbase. Las transacciones son rápidas, baratas y liquidadas en Ethereum. Puedes conectarte con cualquier billetera EVM estándar: MetaMask, Coinbase Wallet, Rabby o cualquier billetera inyectada.",
        },
        {
          q: "¿Es seguro usar WorldPool26?",
          a: "El contrato inteligente está desplegado en cadena y toda la lógica es transparente y verificable. Los premios están bloqueados en el contrato y solo pueden ser distribuidos por las funciones de finalización. Nadie — incluyendo el desarrollador — puede retirar los premios antes de que termine el torneo. El contrato incluye una tarifa de desarrollo (20% de cada mint/ticket va instantáneamente a la billetera del dev; 5% de tarifa en la liquidación), lo cual está indicado de antemano.",
        },
        {
          q: "¿Es esto apuestas?",
          a: "WorldPool26 está diseñado como una plataforma de entretenimiento para aficionados al fútbol — no es un servicio de apuestas. Estás minteando coleccionables digitales (NFTs) y votando en un evento deportivo real. Dicho esto, hay un elemento financiero: gastas ETH y puedes o no recibir una devolución. Participa solo con lo que estés dispuesto a perder.",
        },
      ],
    },
    {
      titleKey: "faq_sec_nc", emoji: "🏆", color: "#fbbf24",
      items: [
        {
          q: "¿Cómo funciona la Copa de Naciones?",
          a: "Cada uno de los 48 países que compiten en la Copa del Mundo 2026 tiene su propio NFT en la plataforma. Minteas NFTs para los países que crees que llegarán lejos. Cuando termine el torneo, todos los poseedores del NFT del país ganador se reparten el 95% del pozo total — en proporción a los NFTs que tienen respecto al suministro total.\n\nEjemplo: Si Francia gana y existen 1.000 NFTs de Francia, y tú tienes 5, recibes el 0,5% del pozo.",
        },
        {
          q: "¿Hay un límite de cuántos NFTs puedo mintear?",
          a: "No. No hay límite de mint por billetera. Puedes mintear tantos NFTs como quieras para cualquier país. El sistema es proporcional — cuanto más tengas en relación al suministro total, mayor será tu parte. Pero como otros también pueden mintear más, el porcentaje no es fijo hasta que acabe el torneo.",
        },
        {
          q: "¿Qué pasa cuando un país es eliminado?",
          a: "Cuando un país es eliminado, la tarjeta del NFT muestra la insignia 'Eliminado'. Sin embargo, el pozo principal es UNO — las eliminaciones no redistribuyen fondos. Todo el pozo se acumula durante el torneo y solo fluye a los poseedores del NFT del campeón al final.",
        },
        {
          q: "¿Cómo se calcula mi pago de la Copa de Naciones?",
          a: "Tu recompensa = (tus NFTs del país ganador ÷ suministro total del país ganador) × 95% del pozo total.\n\nEl 95% es la parte del ganador — el 5% es la tarifa del protocolo al liquidar. El dev también toma el 20% de cada mint por adelantado (antes de entrar al pozo).",
        },
        {
          q: "¿Cuándo puedo reclamar mi recompensa de la Copa de Naciones?",
          a: "Puedes reclamar inmediatamente después de que el torneo sea finalizado en cadena. Aparecerá un modal de ganador en tu próxima visita si tienes NFTs ganadores. Las recompensas no reclamadas permanecen en el contrato por 30 días — después el propietario puede retirarlas. Asegúrate de reclamar dentro de los 30 días.",
        },
        {
          q: "¿Puedo intercambiar mis NFTs de países?",
          a: "Sí. Los NFTs de países son tokens ERC-1155 estándar y serán visibles en OpenSea (Base está soportado). Después de que el torneo comience y el minteo cierre, puedes comprarlos y venderlos en mercados secundarios.",
        },
      ],
    },
    {
      titleKey: "faq_sec_ts", emoji: "⚽", color: "#2563EB",
      items: [
        {
          q: "¿Cómo funciona el pozo del Máximo Goleador?",
          a: "Compras tickets de votación (0,0018 ETH cada uno). Cada ticket te da 1 voto. Votas por el jugador que crees que será el máximo goleador. Cuando termina el torneo y se anuncia el goleador en cadena, todos los que votaron por el jugador correcto se reparten el 95% del pozo — en proporción a los votos emitidos.",
        },
        {
          q: "¿Puedo repartir mis votos entre varios jugadores?",
          a: "Sí. Cada ticket equivale a un voto y puedes votar por diferentes jugadores en transacciones separadas. Si tienes 10 tickets, podrías emitir 7 votos para Mbappé y 3 para Haaland en dos transacciones separadas.",
        },
        {
          q: "¿Qué pasa si compro tickets pero nunca voto?",
          a: "Después de finalizar el Máximo Goleador, si tienes tickets sin usar, puedes llamar a refundUnusedTickets() y recuperar el 80% de lo que pagaste por cada ticket sin usar. La tarifa del 20% del dev no es reembolsable ya que se tomó en la compra.",
        },
        {
          q: "¿Qué pasa si nadie votó por el goleador real?",
          a: "Si el jugador ganador tiene cero votos, nadie puede reclamar recompensas. El pozo permanece en el contrato por 30 días, tras lo cual el propietario puede retirarlo.",
        },
        {
          q: "¿Cómo se calcula mi pago de Máximo Goleador?",
          a: "Tu recompensa = (tus votos al ganador ÷ total de votos al ganador) × 95% del pozo en la finalización.\n\nNota: el pozo en la finalización excluye el ETH reservado para reembolsos de tickets sin usar.",
        },
      ],
    },
    {
      titleKey: "faq_sec_fees", emoji: "💰", color: "#0052FF",
      items: [
        {
          q: "¿Cuánto cuesta?",
          a: "🌍 Mint de NFT de país: 0,0022 ETH cada uno\n🎟️ Ticket de Máximo Goleador: 0,0018 ETH cada uno\nMás una pequeña tarifa de gas de Base (normalmente menos de $0,01) por transacción.",
        },
        {
          q: "¿A dónde va la tarifa?",
          a: "Al comprar: 80% va al pozo, 20% va instantáneamente a la billetera del dev.\n\nAl liquidar: 95% del pozo va a los ganadores, 5% es tarifa de protocolo para el dev.\n\nEsta estructura financia el desarrollo continuo y mantiene la plataforma operativa para futuros torneos.",
        },
        {
          q: "¿Qué pasa con los premios no reclamados?",
          a: "Si un ganador no reclama dentro de los 30 días posteriores a la finalización, el propietario puede llamar a withdrawUnclaimedNationsCup() o withdrawUnclaimedTopScorer() para recuperar esos fondos. Siempre reclama tus recompensas dentro de los 30 días.",
        },
      ],
    },
    {
      titleKey: "faq_sec_wallet", emoji: "🔗", color: "#2563EB",
      items: [
        {
          q: "¿Qué billetera necesito?",
          a: "Cualquier billetera EVM estándar funciona — MetaMask, Coinbase Wallet, Rabby o cualquier billetera inyectada. Simplemente haz clic en 'Conectar Wallet' y aprueba la conexión.",
        },
        {
          q: "Conecté mi billetera pero nada está pasando. ¿Qué hago?",
          a: "Asegúrate de estar en la red Base. La app intentará cambiar de red automáticamente. Si no lo hace, agrega Base manualmente en la configuración de tu billetera: URL RPC https://mainnet.base.org, Chain ID 8453, símbolo ETH.",
        },
        {
          q: "¿Qué pasa con los NFTs después de que termine el torneo?",
          a: "Los NFTs permanecen en cadena para siempre como coleccionables. Después del torneo, las tarjetas de países muestran un botón 'Operar en OpenSea' para que puedas listarlo o venderlos. Los NFTs del país ganador pueden tener valor histórico como recuerdo de la Copa del Mundo.",
        },
        {
          q: "¿Es el contrato de código abierto?",
          a: "El frontend es completamente de código abierto en GitHub (github.com/semtorium/worldpool26). El contrato inteligente está verificado en Basescan, haciendo que toda la lógica sea públicamente legible y auditable.",
        },
      ],
    },
  ],

  zh: [
    {
      titleKey: "faq_sec_about", emoji: "🌍", color: "#0052FF",
      items: [
        {
          q: "WorldPool26是什么？",
          a: "WorldPool26是一个建立在Base上的2026年FIFA世界杯Web3预测平台。它有两个游戏：国家杯，铸造国家NFT，如果您的国家成为冠军就能赢得奖励；最佳射手，投票选出您认为进球最多的球员。两个奖金池均由参与者出资，并通过智能合约自动向获胜者支付。",
        },
        {
          q: "它在哪个区块链上运行？",
          a: "WorldPool26运行在Base上，这是Coinbase开发的EVM兼容以太坊Layer 2区块链。交易快速、便宜，并在以太坊上最终确认。您可以使用任何标准EVM钱包连接——MetaMask、Coinbase Wallet、Rabby或任何注入式钱包。",
        },
        {
          q: "WorldPool26安全吗？",
          a: "智能合约已在链上部署，所有逻辑透明可验证。奖金池锁定在合约中，只能通过终结函数分配。任何人——包括开发者——在锦标赛结束前都无法提取奖金池。合约包含开发费（每次铸造/票券的20%立即进入开发者钱包；结算时5%的手续费），这已提前披露。",
        },
        {
          q: "这是赌博吗？",
          a: "WorldPool26被设计为足球迷的娱乐平台——而非赌博服务。您在铸造数字收藏品（NFT）并对真实世界体育赛事进行投票。话虽如此，确实存在财务因素：您花费ETH，可能会或可能不会获得回报。请仅用您能承受损失的金额参与。",
        },
      ],
    },
    {
      titleKey: "faq_sec_nc", emoji: "🏆", color: "#fbbf24",
      items: [
        {
          q: "国家杯是如何运作的？",
          a: "2026年世界杯参赛的48个国家在平台上各有其NFT。您为您认为会晋级的国家铸造NFT。锦标赛结束时，持有获胜国家NFT的所有人分享总国家杯奖金池的95%——按持有NFT数量与该国总供应量的比例分配。\n\n示例：如果法国获胜，存在1000个法国NFT，而您持有其中5个，您将获得奖金池的0.5%。",
        },
        {
          q: "我可以铸造的NFT数量有限制吗？",
          a: "没有。没有每个钱包的铸造限制。您可以为任何国家铸造任意数量的NFT。系统按比例分配——您相对于总供应量持有的越多，您的份额越大。但由于其他人也可以铸造更多，在锦标赛结束之前百分比并不固定。",
        },
        {
          q: "当一个国家被淘汰时会发生什么？",
          a: "当一个国家被淘汰时，NFT卡片会显示「已淘汰」徽章。然而，主奖金池是一个整体——淘汰不会重新分配资金。整个奖金池在整个锦标赛中积累，最终只流向冠军NFT持有者。",
        },
        {
          q: "我的国家杯奖励如何计算？",
          a: "您的奖励 = (您持有的获胜国NFT ÷ 获胜国总供应量) × 国家杯总奖金池的95%。\n\n95%是获胜者份额——5%是结算时收取的协议费。开发者还会从每次铸造中预先收取20%（在进入奖金池之前），所以您看到的奖金池已经扣除了这部分。",
        },
        {
          q: "我什么时候可以领取国家杯奖励？",
          a: "您可以在锦标赛在链上终结后立即领取。如果您持有获胜NFT，下次访问时将出现获胜者弹窗。未领取的奖励在合约中保留30天——之后所有者可以提取。请务必在锦标赛结束后30天内领取您的奖励。",
        },
        {
          q: "我可以交易我的国家NFT吗？",
          a: "可以。国家NFT是标准ERC-1155代币，将在OpenSea上可见（Base受支持）。锦标赛开始且铸造关闭后，您可以在二级市场上买卖。随着国家在锦标赛中晋级，其NFT价值通常会上涨。",
        },
      ],
    },
    {
      titleKey: "faq_sec_ts", emoji: "⚽", color: "#2563EB",
      items: [
        {
          q: "最佳射手奖金池是如何运作的？",
          a: "您购买投票票券（每张0.0018 ETH）。每张票券给您1票。您投票给您认为将成为锦标赛最佳射手的球员。锦标赛结束后，当最佳射手在链上宣布时，所有投票给正确球员的人分享最佳射手奖金池的95%——按他们为获胜者投票数量的比例分配。",
        },
        {
          q: "我可以把票分给多个球员吗？",
          a: "可以。每张票券等于一票，您可以在不同的交易中为不同球员投票。如果您有10张票券，您可以通过两次独立投票交易为姆巴佩投7票，为哈兰德投3票。",
        },
        {
          q: "如果我买了票券但从不投票怎么办？",
          a: "最佳射手终结后，如果您有未使用的（未投票的）票券，您可以调用refundUnusedTickets()并收回每张未使用票券所付金额的80%。20%的开发费不可退款，因为它在购买时已扣取。",
        },
        {
          q: "如果没有人投票给真正的最佳射手怎么办？",
          a: "如果获胜球员得票为零，则没有人可以领取奖励。奖金池在合约中保留30天，之后所有者可以提取。合约所有者也可以用任何字符串终结，包括不在默认列表中的写入名称。",
        },
        {
          q: "我的最佳射手奖励如何计算？",
          a: "您的奖励 = (您为获胜者投的票 ÷ 获胜者的总票数) × 终结时最佳射手奖金池的95%。\n\n注意：终结时的奖金池不包括为未使用票券退款而保留的ETH，因此只分配「活跃」部分。",
        },
      ],
    },
    {
      titleKey: "faq_sec_fees", emoji: "💰", color: "#0052FF",
      items: [
        {
          q: "费用是多少？",
          a: "🌍 国家NFT铸造：每个0.0022 ETH\n🎟️ 最佳射手票券：每张0.0018 ETH\n另加每笔交易少量Base gas费（通常低于$0.01）。",
        },
        {
          q: "费用流向哪里？",
          a: "购买时：80%进入奖金池，20%立即进入开发者钱包。\n\n结算时：95%的奖金池分给获胜者，5%作为协议费归开发者。\n\n这种结构资助持续开发，使平台为未来锦标赛保持运转。",
        },
        {
          q: "未领取的奖励会怎样？",
          a: "如果获胜者在终结后30天内未领取，所有者可以调用withdrawUnclaimedNationsCup()或withdrawUnclaimedTopScorer()来收回这些资金。请务必在锦标赛结束后30天内领取您的奖励。",
        },
      ],
    },
    {
      titleKey: "faq_sec_wallet", emoji: "🔗", color: "#2563EB",
      items: [
        {
          q: "我需要哪个钱包？",
          a: "任何标准EVM钱包都可以——MetaMask、Coinbase Wallet、Rabby或任何注入式钱包。只需点击「连接钱包」并批准连接即可。",
        },
        {
          q: "我连接了钱包但什么都没发生。我该怎么办？",
          a: "确保您在Base网络上。应用程序将尝试自动切换网络。如果没有，请在钱包设置中手动添加Base：RPC URL https://mainnet.base.org，Chain ID 8453，符号ETH。",
        },
        {
          q: "锦标赛结束后NFT会怎样？",
          a: "NFT作为收藏品永久保留在链上。锦标赛后，国家卡片会显示「在OpenSea交易」按钮，您可以在二级市场上列出或出售它们。获胜国家的NFT可能作为世界杯纪念品具有历史价值。",
        },
        {
          q: "合约是开源的吗？",
          a: "前端在GitHub上完全开源（github.com/semtorium/worldpool26）。智能合约在Basescan上已验证，使所有逻辑公开可读和可审计。",
        },
      ],
    },
  ],

  ar: [
    {
      titleKey: "faq_sec_about", emoji: "🌍", color: "#0052FF",
      items: [
        {
          q: "ما هو WorldPool26؟",
          a: "WorldPool26 منصة تنبؤات Web3 مبنية على Base لكأس العالم FIFA 2026. تحتوي على لعبتين: كأس الأمم، حيث تسك NFT للدول وتفوز إذا أصبح بلدك بطلاً، وهداف البطولة، حيث تصوّت للاعب الذي تعتقد أنه سيسجل أكثر الأهداف. كلا المجموعتين ممولتان من المشاركين وتُدفع للفائزين تلقائياً عبر عقد ذكي.",
        },
        {
          q: "على أي بلوكشين يعمل؟",
          a: "يعمل WorldPool26 على Base، وهو بلوكشين Ethereum Layer 2 متوافق مع EVM طوّرته Coinbase. المعاملات سريعة وغير مكلفة ومستقرة على Ethereum. يمكنك الاتصال بأي محفظة EVM قياسية — MetaMask أو Coinbase Wallet أو Rabby أو أي محفظة مُضمَّنة.",
        },
        {
          q: "هل WorldPool26 آمن للاستخدام؟",
          a: "العقد الذكي مُنشر على السلسلة وجميع المنطق شفاف وقابل للتحقق. تُقفل مجموعات الجوائز في العقد ولا يمكن توزيعها إلا من خلال وظائف الإنهاء. لا أحد — بما في ذلك المطور — يستطيع سحب مجموعات الجوائز قبل انتهاء البطولة. يتضمن العقد رسوم التطوير (20% من كل عملية سك/تذكرة تذهب فوراً لمحفظة المطور؛ رسوم 5% عند التسوية)، وهذا مُفصح عنه مسبقاً.",
        },
        {
          q: "هل هذا قمار؟",
          a: "تم تصميم WorldPool26 كمنصة ترفيهية لمحبي كرة القدم — وليس خدمة قمار. أنت تسك مقتنيات رقمية (NFTs) وتصوّت على حدث رياضي في العالم الحقيقي. مع ذلك، هناك عنصر مالي: تنفق ETH وقد تحصل أو لا تحصل على عائد. شارك فقط بما تستطيع تحمّل خسارته.",
        },
      ],
    },
    {
      titleKey: "faq_sec_nc", emoji: "🏆", color: "#fbbf24",
      items: [
        {
          q: "كيف تعمل كأس الأمم؟",
          a: "كل دولة من الدول الـ48 المتنافسة في كأس العالم 2026 لها NFT خاص بها على المنصة. تسك NFTs للدول التي تعتقد أنها ستتقدم. عند انتهاء البطولة، يتقاسم جميع حاملي NFT الدولة الفائزة 95% من إجمالي مجموعة جوائز كأس الأمم — بما يتناسب مع عدد NFTs التي يمتلكونها مقارنة بالإجمالي.\n\nمثال: إذا فازت فرنسا وكان هناك 1,000 NFT لفرنسا، وتمتلك 5 منها، فستحصل على 0.5% من مجموعة الجوائز.",
        },
        {
          q: "هل هناك حد لعدد NFTs التي يمكنني سكّها؟",
          a: "لا. لا يوجد حد للسك لكل محفظة. يمكنك سك أي عدد تريد من NFTs لأي دولة. النظام تناسبي — كلما امتلكت أكثر مقارنة بالإجمالي، كانت حصتك أكبر. لكن نظراً لأن الآخرين يمكنهم أيضاً سك المزيد، فإن النسبة المئوية غير ثابتة حتى نهاية البطولة.",
        },
        {
          q: "ماذا يحدث عندما يُقصى بلد ما؟",
          a: "عندما يُقصى بلد ما، تُظهر بطاقة NFT شارة 'مقصى'. ومع ذلك، فإن مجموعة الجوائز الرئيسية واحدة — الإقصاءات لا تُعيد توزيع الأموال. تتراكم المجموعة بأكملها طوال البطولة وتتدفق فقط إلى حاملي NFT البطل في النهاية.",
        },
        {
          q: "كيف يتم احتساب مكافأتي في كأس الأمم؟",
          a: "مكافأتك = (NFTs الخاصة بك للدولة الفائزة ÷ الإجمالي للدولة الفائزة) × 95% من إجمالي مجموعة الجوائز.\n\n95% هي حصة الفائز — 5% رسوم البروتوكول عند التسوية. يأخذ المطور أيضاً 20% من كل عملية سك مقدماً (قبل دخولها المجموعة).",
        },
        {
          q: "متى يمكنني المطالبة بمكافأتي في كأس الأمم؟",
          a: "يمكنك المطالبة فوراً بعد إنهاء البطولة على السلسلة. ستظهر نافذة منبثقة للفائز في زيارتك التالية إذا كنت تمتلك NFTs فائزة. تبقى المكافآت غير المُطالَب بها في العقد لمدة 30 يوماً — بعد ذلك يمكن للمالك سحبها. تأكد من المطالبة خلال 30 يوماً من انتهاء البطولة.",
        },
        {
          q: "هل يمكنني تداول NFTs الدول؟",
          a: "نعم. NFTs الدول عبارة عن رموز ERC-1155 قياسية وستكون مرئية على OpenSea (Base مدعوم). بعد بدء البطولة وإغلاق السك، يمكنك شراؤها وبيعها في الأسواق الثانوية. عادةً ما ترتفع قيمة NFT الدولة كلما تقدمت في البطولة.",
        },
      ],
    },
    {
      titleKey: "faq_sec_ts", emoji: "⚽", color: "#2563EB",
      items: [
        {
          q: "كيف تعمل مجموعة هداف البطولة؟",
          a: "تشتري تذاكر تصويت (0.0018 ETH لكل منها). كل تذكرة تمنحك صوتاً واحداً. تصوّت للاعب الذي تعتقد أنه سيكون هداف البطولة. عند انتهاء البطولة والإعلان عن الهداف على السلسلة، يتقاسم جميع من صوّتوا للاعب الصحيح 95% من مجموعة جوائز هداف البطولة.",
        },
        {
          q: "هل يمكنني تقسيم أصواتي على عدة لاعبين؟",
          a: "نعم. كل تذكرة تساوي صوتاً واحداً ويمكنك التصويت للاعبين مختلفين في معاملات منفصلة. إذا كان لديك 10 تذاكر، يمكنك التصويت 7 مرات لمبابي و3 مرات لهالاند في معاملتين منفصلتين.",
        },
        {
          q: "ماذا لو اشتريت تذاكر ولم أصوّت قط؟",
          a: "بعد إنهاء هداف البطولة، إذا كان لديك تذاكر غير مستخدمة، يمكنك استدعاء refundUnusedTickets() واسترداد 80% مما دفعته لكل تذكرة غير مستخدمة. رسوم المطور البالغة 20% غير قابلة للاسترداد لأنها أُخذت عند الشراء.",
        },
        {
          q: "ماذا لو لم يصوّت أحد للهداف الحقيقي؟",
          a: "إذا كان للاعب الفائز صفر أصوات، فلا يمكن لأحد المطالبة بالمكافآت. تبقى مجموعة الجوائز في العقد لمدة 30 يوماً، وبعدها يمكن للمالك سحبها.",
        },
        {
          q: "كيف يتم احتساب مكافأتي في هداف البطولة؟",
          a: "مكافأتك = (أصواتك للفائز ÷ إجمالي الأصوات للفائز) × 95% من مجموعة هداف البطولة عند الإنهاء.\n\nملاحظة: المجموعة عند الإنهاء تستثني ETH المحجوزة لاسترداد التذاكر غير المستخدمة.",
        },
      ],
    },
    {
      titleKey: "faq_sec_fees", emoji: "💰", color: "#0052FF",
      items: [
        {
          q: "كم تبلغ التكلفة؟",
          a: "🌍 سك NFT الدولة: 0.0022 ETH لكل منها\n🎟️ تذكرة هداف البطولة: 0.0018 ETH لكل منها\nبالإضافة إلى رسوم gas صغيرة على Base (عادةً أقل من $0.01) لكل معاملة.",
        },
        {
          q: "أين تذهب الرسوم؟",
          a: "عند الشراء: 80% تذهب إلى مجموعة الجوائز، 20% تذهب فوراً إلى محفظة المطور.\n\nعند التسوية: 95% من المجموعة تذهب للفائزين، 5% رسوم بروتوكول للمطور.\n\nهذا الهيكل يموّل التطوير المستمر ويبقي المنصة تعمل للبطولات القادمة.",
        },
        {
          q: "ماذا يحدث للجوائز غير المُطالَب بها؟",
          a: "إذا لم يطالب فائز خلال 30 يوماً بعد الإنهاء، يمكن للمالك استدعاء withdrawUnclaimedNationsCup() أو withdrawUnclaimedTopScorer() لاسترداد تلك الأموال. احرص دائماً على المطالبة بمكافآتك خلال 30 يوماً من انتهاء البطولة.",
        },
      ],
    },
    {
      titleKey: "faq_sec_wallet", emoji: "🔗", color: "#2563EB",
      items: [
        {
          q: "أي محفظة أحتاج؟",
          a: "أي محفظة EVM قياسية تعمل — MetaMask أو Coinbase Wallet أو Rabby أو أي محفظة مُضمَّنة. فقط انقر على 'ربط المحفظة' وافق على الاتصال.",
        },
        {
          q: "ربطت محفظتي لكن لا شيء يحدث. ماذا أفعل؟",
          a: "تأكد من أنك على شبكة Base. ستحاول التطبيق تبديل الشبكات تلقائياً. إذا لم يحدث ذلك، أضف Base يدوياً في إعدادات محفظتك: RPC URL https://mainnet.base.org، Chain ID 8453، الرمز ETH.",
        },
        {
          q: "ماذا يحدث للـ NFTs بعد انتهاء البطولة؟",
          a: "تبقى NFTs على السلسلة إلى الأبد كمقتنيات. بعد البطولة، تعرض بطاقات الدول زر 'تداول على OpenSea' حتى تتمكن من إدراجها أو بيعها في الأسواق الثانوية. قد تحمل NFTs الدولة الفائزة قيمة تاريخية كتذكار لكأس العالم.",
        },
        {
          q: "هل العقد مفتوح المصدر؟",
          a: "الواجهة الأمامية مفتوحة المصدر بالكامل على GitHub (github.com/semtorium/worldpool26). العقد الذكي موثَّق على Basescan، مما يجعل جميع المنطق قابلاً للقراءة والتدقيق من الجمهور.",
        },
      ],
    },
  ],

  ko: [
    {
      titleKey: "faq_sec_about", emoji: "🌍", color: "#0052FF",
      items: [
        {
          q: "WorldPool26는 무엇인가요?",
          a: "WorldPool26는 2026 FIFA 월드컵을 위해 Base 위에 구축된 Web3 예측 플랫폼입니다. 두 가지 게임이 있습니다: 네이션스컵은 국가 NFT를 민팅하고 해당 국가가 챔피언이 되면 상금을 받는 게임이며, 득점왕은 가장 많은 골을 넣을 것이라고 생각하는 선수에게 투표하는 게임입니다. 두 상금 풀 모두 참가자들이 자금을 대고 스마트 컨트랙트를 통해 자동으로 승자에게 지급됩니다.",
        },
        {
          q: "어느 블록체인에서 운영되나요?",
          a: "WorldPool26는 Coinbase가 구축한 EVM 호환 이더리움 Layer 2 블록체인인 Base 위에서 운영됩니다. 거래는 빠르고 저렴하며 이더리움에 결제됩니다. MetaMask, Coinbase Wallet, Rabby 또는 모든 주입형 지갑으로 연결할 수 있습니다.",
        },
        {
          q: "WorldPool26는 안전한가요?",
          a: "스마트 컨트랙트는 온체인에 배포되어 있으며 모든 로직은 투명하고 검증 가능합니다. 상금 풀은 컨트랙트에 잠겨 있으며 종료 함수에 의해서만 배분될 수 있습니다. 토너먼트가 끝나기 전에는 개발자를 포함한 누구도 상금 풀을 인출할 수 없습니다. 컨트랙트에는 개발자 수수료가 포함되어 있습니다(각 민팅/티켓의 20%가 즉시 개발자 지갑으로 이동; 결제 시 5% 수수료), 이는 사전에 공개되어 있습니다.",
        },
        {
          q: "이것이 도박인가요?",
          a: "WorldPool26는 축구 팬을 위한 엔터테인먼트 플랫폼으로 설계되었습니다 — 도박 서비스가 아닙니다. 디지털 수집품(NFT)을 민팅하고 실제 스포츠 이벤트에 투표하는 것입니다. 그렇지만 재무적 요소가 있습니다: ETH를 지출하며 수익을 얻을 수도 있고 얻지 못할 수도 있습니다. 잃어도 괜찮은 금액만으로 참여하세요.",
        },
      ],
    },
    {
      titleKey: "faq_sec_nc", emoji: "🏆", color: "#fbbf24",
      items: [
        {
          q: "네이션스컵은 어떻게 작동하나요?",
          a: "2026 월드컵에 참가하는 48개국은 각각 플랫폼에서 자체 NFT를 보유합니다. 좋은 성적을 거둘 것으로 생각하는 국가의 NFT를 민팅합니다. 토너먼트가 끝나면 우승 국가의 NFT를 보유한 모든 사람이 총 네이션스컵 상금 풀의 95%를 나눠 가집니다 — 해당 국가의 총 공급량 대비 보유한 NFT 수에 비례하여.\n\n예시: 프랑스가 우승하고 프랑스 NFT가 1,000개 존재하며 당신이 5개를 보유하면 상금 풀의 0.5%를 받습니다.",
        },
        {
          q: "민팅할 수 있는 NFT 수에 제한이 있나요?",
          a: "없습니다. 지갑당 민팅 제한이 없습니다. 어떤 국가든 원하는 만큼 NFT를 민팅할 수 있습니다. 시스템은 비례 배분 방식으로 — 총 공급량 대비 더 많이 보유할수록 몫이 더 커집니다. 하지만 다른 사람들도 더 많이 민팅할 수 있으므로 토너먼트가 끝날 때까지 비율은 고정되지 않습니다.",
        },
        {
          q: "국가가 탈락하면 어떻게 되나요?",
          a: "국가가 탈락하면 NFT 카드에 '탈락' 배지가 표시됩니다. 그러나 주요 상금 풀은 하나입니다 — 탈락으로 인해 자금이 재분배되지 않습니다. 전체 풀은 토너먼트 내내 누적되며 마지막에 챔피언 NFT 보유자들에게만 배분됩니다.",
        },
        {
          q: "네이션스컵 지급액은 어떻게 계산되나요?",
          a: "귀하의 보상 = (우승 국가 NFT ÷ 우승 국가 총 공급량) × 총 네이션스컵 풀의 95%.\n\n95%는 승자 몫이며 — 5%는 결제 시 수취하는 프로토콜 수수료입니다. 개발자도 각 민팅에서 선불로 20%를 가져갑니다(풀에 들어가기 전), 따라서 보이는 풀은 이미 그 차감 후 금액입니다.",
        },
        {
          q: "네이션스컵 보상은 언제 청구할 수 있나요?",
          a: "토너먼트가 온체인에서 종료된 직후 즉시 청구할 수 있습니다. 우승 NFT를 보유하고 있다면 다음 방문 시 승자 모달이 나타납니다. 청구되지 않은 보상은 30일 동안 컨트랙트에 남아 있으며 — 이후 소유자가 인출할 수 있습니다. 토너먼트 종료 후 30일 이내에 반드시 청구하세요.",
        },
        {
          q: "국가 NFT를 거래할 수 있나요?",
          a: "네. 국가 NFT는 표준 ERC-1155 토큰으로 OpenSea에서 볼 수 있습니다(Base 지원). 토너먼트가 시작되고 민팅이 종료된 후 2차 시장에서 사고팔 수 있습니다. 국가의 NFT 가치는 일반적으로 토너먼트에서 진출할수록 오릅니다.",
        },
      ],
    },
    {
      titleKey: "faq_sec_ts", emoji: "⚽", color: "#2563EB",
      items: [
        {
          q: "득점왕 풀은 어떻게 작동하나요?",
          a: "투표 티켓을 구매합니다(각 0.0018 ETH). 각 티켓은 1표를 제공합니다. 토너먼트 득점왕이 될 것으로 생각하는 선수에게 투표합니다. 토너먼트가 끝나고 득점왕이 온체인에서 발표되면 올바른 선수에게 투표한 모든 사람이 득점왕 상금 풀의 95%를 나눠 가집니다.",
        },
        {
          q: "여러 선수에게 표를 나눌 수 있나요?",
          a: "네. 각 티켓은 하나의 투표와 같으며 별도의 거래로 다른 선수들에게 투표할 수 있습니다. 티켓이 10개 있다면 두 번의 별도 투표 거래에서 음바페에게 7표, 홀란에게 3표를 던질 수 있습니다.",
        },
        {
          q: "티켓을 구매했지만 투표하지 않으면 어떻게 되나요?",
          a: "득점왕 종료 후 사용하지 않은(투표하지 않은) 티켓이 있다면 refundUnusedTickets()를 호출하여 미사용 티켓당 납부한 금액의 80%를 돌려받을 수 있습니다. 20% 개발자 수수료는 구매 시 수취되었으므로 환불되지 않습니다.",
        },
        {
          q: "실제 득점왕에게 아무도 투표하지 않으면 어떻게 되나요?",
          a: "우승 선수의 득표수가 0이면 아무도 보상을 청구할 수 없습니다. 상금 풀은 30일 동안 컨트랙트에 남아 있으며 이후 소유자가 인출할 수 있습니다.",
        },
        {
          q: "득점왕 지급액은 어떻게 계산되나요?",
          a: "귀하의 보상 = (승자에게 투표한 표 ÷ 승자에 대한 총 투표수) × 종료 시 득점왕 풀의 95%.\n\n참고: 종료 시 풀에서 미사용 티켓 환불을 위해 예약된 ETH는 제외되므로 '활성' 부분만 분배됩니다.",
        },
      ],
    },
    {
      titleKey: "faq_sec_fees", emoji: "💰", color: "#0052FF",
      items: [
        {
          q: "비용이 얼마인가요?",
          a: "🌍 국가 NFT 민팅: 각 0.0022 ETH\n🎟️ 득점왕 티켓: 각 0.0018 ETH\n거래당 소액의 Base 가스 수수료(일반적으로 $0.01 미만) 추가.",
        },
        {
          q: "수수료는 어디로 가나요?",
          a: "구매 시: 80%는 상금 풀로, 20%는 즉시 개발자 지갑으로 이동합니다.\n\n결제 시: 풀의 95%는 승자에게, 5%는 프로토콜 수수료로 개발자에게 이동합니다.\n\n이 구조는 지속적인 개발에 자금을 지원하고 향후 토너먼트를 위해 플랫폼을 운영 상태로 유지합니다.",
        },
        {
          q: "청구되지 않은 상금은 어떻게 되나요?",
          a: "승자가 종료 후 30일 이내에 청구하지 않으면 소유자가 withdrawUnclaimedNationsCup() 또는 withdrawUnclaimedTopScorer()를 호출하여 해당 자금을 회수할 수 있습니다. 토너먼트 종료 후 30일 이내에 항상 보상을 청구하세요.",
        },
      ],
    },
    {
      titleKey: "faq_sec_wallet", emoji: "🔗", color: "#2563EB",
      items: [
        {
          q: "어떤 지갑이 필요한가요?",
          a: "모든 표준 EVM 지갑이 작동합니다 — MetaMask, Coinbase Wallet, Rabby 또는 모든 주입형 지갑. '지갑 연결'을 클릭하고 연결을 승인하기만 하면 됩니다.",
        },
        {
          q: "지갑을 연결했는데 아무 일도 일어나지 않습니다. 어떻게 해야 하나요?",
          a: "Base 네트워크에 있는지 확인하세요. 앱이 자동으로 네트워크를 전환하려고 시도할 것입니다. 그렇지 않으면 지갑 설정에서 Base를 수동으로 추가하세요: RPC URL https://mainnet.base.org, Chain ID 8453, 기호 ETH.",
        },
        {
          q: "토너먼트가 끝난 후 NFT는 어떻게 되나요?",
          a: "NFT는 영원히 온체인에 수집품으로 남습니다. 토너먼트 후 국가 카드에는 'OpenSea에서 거래' 버튼이 표시되어 2차 시장에서 목록을 만들거나 판매할 수 있습니다. 우승 국가 NFT는 월드컵 기념품으로 역사적 가치를 가질 수 있습니다.",
        },
        {
          q: "컨트랙트는 오픈 소스인가요?",
          a: "프론트엔드는 GitHub(github.com/semtorium/worldpool26)에서 완전히 오픈 소스입니다. 스마트 컨트랙트는 Basescan에서 검증되어 모든 로직이 공개적으로 읽기 가능하고 감사 가능합니다.",
        },
      ],
    },
  ],
};

export function getFaqSections(lang: Lang): FaqSection[] {
  return faqData[lang] ?? faqData.en;
}
