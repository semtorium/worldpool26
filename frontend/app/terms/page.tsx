import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — WorldPool26",
  description: "Terms of Use and Privacy Policy for WorldPool26",
};

export default function TermsPage() {
  return (
    <div style={{ background: "#050810", minHeight: "100vh", color: "#f0f4ff" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            color: "#00ff88", fontSize: 13, fontWeight: 700,
            textDecoration: "none", marginBottom: 32,
          }}>
            ← Back to WorldPool26
          </Link>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
            Terms of Use & Privacy Policy
          </h1>
          <p style={{ color: "#6b7a9a", fontSize: 14 }}>
            Last updated: June 1, 2026 · Effective immediately
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

          <Section title="1. Acceptance of Terms">
            <P>By accessing or using WorldPool26 (the "Platform"), available at worldpool26.com, you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, you must not access or use the Platform.</P>
            <P>These Terms constitute a legally binding agreement between you and WorldPool26. We reserve the right to modify these Terms at any time. Continued use of the Platform after any modification constitutes your acceptance of the revised Terms.</P>
          </Section>

          <Section title="2. Platform Description">
            <P>WorldPool26 is an entertainment and sports prediction platform built on the Base blockchain network (an Ethereum Layer 2). The Platform allows users to:</P>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Mint ERC-1155 digital collectible NFTs representing national football teams participating in the 2026 FIFA World Cup.</Li>
              <Li>Purchase tickets and cast votes predicting the Top Scorer of the 2026 FIFA World Cup.</Li>
              <Li>Participate in prize pool distributions if their predictions are correct, in accordance with the smart contract logic.</Li>
            </ul>
            <P>WorldPool26 is strictly an entertainment and prediction platform. It is <strong style={{ color: "#fff" }}>not</strong> a gambling platform, a financial product, an investment vehicle, or a securities offering. NFTs purchased on the Platform are digital collectibles with an entertainment utility and do not constitute financial instruments.</P>
          </Section>

          <Section title="3. Eligibility">
            <P>You must be at least 18 years of age (or the age of majority in your jurisdiction, whichever is higher) to use the Platform.</P>
            <P>By using the Platform, you represent and warrant that:</P>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>You are of legal age in your jurisdiction.</Li>
              <Li>Your use of the Platform does not violate any applicable laws or regulations in your jurisdiction.</Li>
              <Li>You are not located in, or a citizen or resident of, any jurisdiction where participation in blockchain-based prediction platforms is prohibited or restricted.</Li>
              <Li>You are not a citizen or resident of the United States of America.</Li>
            </ul>
          </Section>

          <Section title="4. Blockchain Transactions & Smart Contracts">
            <P>All transactions on the Platform are executed on the Base blockchain network via smart contracts. By interacting with the Platform's smart contracts, you acknowledge and agree that:</P>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li><strong style={{ color: "#fff" }}>Irreversibility:</strong> All blockchain transactions are final and irreversible. We cannot reverse, cancel, or refund any transaction once submitted to the blockchain.</Li>
              <Li><strong style={{ color: "#fff" }}>Smart contract risk:</strong> Smart contracts may contain bugs or vulnerabilities despite our best efforts. You interact with them at your own risk.</Li>
              <Li><strong style={{ color: "#fff" }}>Gas fees:</strong> You are solely responsible for all network transaction fees ("gas fees") associated with your transactions.</Li>
              <Li><strong style={{ color: "#fff" }}>Wallet security:</strong> You are solely responsible for the security of your digital wallet, private keys, and seed phrases. We do not have access to your wallet or funds.</Li>
              <Li><strong style={{ color: "#fff" }}>No guarantee of prize:</strong> Participation does not guarantee any prize or return. Prize pool distributions are determined solely by smart contract logic and the outcome of the 2026 FIFA World Cup.</Li>
            </ul>
          </Section>

          <Section title="5. NFTs & Prize Pools">
            <P><strong style={{ color: "#fff" }}>Nations Cup NFTs:</strong> Each NFT represents a digital collectible for a specific national team. If the team whose NFT you hold is declared the winner of the Nations Cup game upon tournament finalization, you will be eligible to claim a pro-rata share of the Nations Cup prize pool, as determined by the smart contract.</P>
            <P><strong style={{ color: "#fff" }}>Top Scorer Tickets:</strong> Each ticket represents one vote for a predicted top scorer. If the player you voted for is declared the Top Scorer upon tournament finalization, you will be eligible to claim a share of the Top Scorer prize pool, as determined by the smart contract.</P>
            <P><strong style={{ color: "#fff" }}>Fee structure:</strong> 20% of each mint/ticket purchase is allocated to platform development. At settlement, 95% of the accumulated prize pool is distributed to winners, and 5% is allocated to platform development. All fees are transparently handled by the smart contract.</P>
            <P><strong style={{ color: "#fff" }}>Mint limits:</strong> A maximum of 10 NFTs per national team per wallet address applies. This limit is enforced at the smart contract level.</P>
          </Section>

          <Section title="6. Prohibited Activities">
            <P>You agree not to:</P>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Use the Platform for any unlawful purpose or in violation of any applicable laws.</Li>
              <Li>Attempt to exploit, manipulate, or interfere with the Platform's smart contracts or frontend.</Li>
              <Li>Use automated bots, scripts, or other automated means to interact with the Platform.</Li>
              <Li>Misrepresent your identity, age, or jurisdiction.</Li>
              <Li>Engage in any activity that could damage, disable, or impair the Platform or its infrastructure.</Li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <P>The Platform, including its design, code, branding, and content (excluding third-party content such as national flags and FIFA-related imagery), is the intellectual property of WorldPool26. You may not reproduce, distribute, or create derivative works without our express written permission.</P>
            <P>National flag imagery is used under fair use for informational and entertainment purposes. WorldPool26 is not affiliated with FIFA, any national football federation, or any other governing sports body.</P>
          </Section>

          <Section title="8. Disclaimers & Limitation of Liability">
            <P>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WORLDPOOL26 DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</P>
            <P>WORLDPOOL26 SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF FUNDS, LOSS OF DATA, OR LOSS OF PROFITS, ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM.</P>
            <P>We are not responsible for the actions or omissions of the Base blockchain network, wallet providers, or any third-party services.</P>
          </Section>

          <Section title="9. Privacy Policy">
            <P><strong style={{ color: "#fff" }}>Data we collect:</strong> WorldPool26 does not collect personal data through traditional means. The Platform operates in a decentralized manner. The only data associated with your activity is your public blockchain wallet address and on-chain transaction data, which is publicly visible on the Base blockchain by nature of the technology.</P>
            <P><strong style={{ color: "#fff" }}>Cookies & local storage:</strong> The Platform uses browser local storage solely to remember your preferred language and last active tab. No tracking cookies or third-party analytics are used.</P>
            <P><strong style={{ color: "#fff" }}>Third-party services:</strong> The Platform uses the following third-party services which may have their own privacy policies: MetaMask / Coinbase Wallet for wallet connectivity, Vercel for hosting, and Cloudflare for DNS and DDoS protection.</P>
            <P><strong style={{ color: "#fff" }}>Data sharing:</strong> We do not sell, rent, or share any user data with third parties for commercial purposes.</P>
          </Section>

          <Section title="10. Governing Law & Disputes">
            <P>These Terms shall be governed by and construed in accordance with general principles of international law, without regard to any specific jurisdiction's conflict of law provisions. Any dispute arising from these Terms or your use of the Platform shall first be attempted to be resolved through good-faith negotiation.</P>
          </Section>

          <Section title="11. Miscellaneous">
            <P>If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect. Our failure to enforce any right or provision shall not constitute a waiver of such right or provision.</P>
            <P>These Terms constitute the entire agreement between you and WorldPool26 regarding your use of the Platform.</P>
          </Section>

          <Section title="12. Contact">
            <P>For any questions regarding these Terms, please contact us through the official WorldPool26 community channels.</P>
          </Section>

          {/* Footer */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 24,
            textAlign: "center",
          }}>
            <p style={{ color: "#6b7a9a", fontSize: 12 }}>
              © 2026 WorldPool26 · Built on Base · Not affiliated with FIFA
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontSize: 18, fontWeight: 800, color: "#fff",
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "#b0bcd4", fontSize: 14, lineHeight: 1.75 }}>
      {children}
    </p>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ color: "#b0bcd4", fontSize: 14, lineHeight: 1.75 }}>
      {children}
    </li>
  );
}
