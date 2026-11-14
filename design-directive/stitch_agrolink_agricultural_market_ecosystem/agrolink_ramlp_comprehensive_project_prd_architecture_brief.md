# Product Requirement Document (PRD) — AgroLink RAMLP (Rural Agricultural Market Linkage Platform)

**Document Reference**: PRD-AGROLINK-RAMLP-2025-V1.0  
**Project Codename**: AgroLink Continental  
**Status**: APPROVED & ADOPTED  
**Target Region**: Nigeria (Pan-African Expansion Ready)  
**Primary Regulatory Frameworks**: Central Bank of Nigeria (CBN) Circular `FSR/DIR/GEN/07/041`, NIBSS Electronic Settlement Mandates, Federal Ministry of Agriculture & Food Security (FMAFS), SON & NAFDAC Quality Standards, Arbitration and Mediation Act 2023.

---

## 1. Executive Summary & Vision

### 1.1 Problem Statement
The Nigerian agricultural value chain represents over **24% of national GDP** and employs more than **35% of the labor force**, yet it suffers from structural inefficiencies that cost producers and off-takers over **₦3.2 Trillion annually in post-harvest losses, counterparty fraud, and haulage disputes**:
1. **Pervasive Payment Default & Escrow Deficits**: Smallholder farmers routinely face delayed payouts or outright non-payment after loading produce onto logistics trucks. Conversely, industrial food millers and grain processors (off-takers) risk advancing capital for substandard, high-moisture, or adulterated commodities.
2. **Weighbridge & Quality Discrepancies**: Lack of unified, tamper-evident quality inspection protocols between farmgate loading hubs (e.g., Saki, Gboko, Dawanau) and urban manufacturing silos (Lagos, Ibadan, Kano) leads to protracted disputes regarding weight loss and moisture degradation.
3. **Digital Exclusion of Rural Smallholders**: Millions of rural agrarian producers operate feature phones with 2G/EDGE GSM connectivity, excluding them from smartphone-only agritech apps.
4. **Logistics Friction & Empty Return Hauls**: Fragmented haulage operators operate at low margins with zero transit payment security and frequent uncompensated transit delays.

### 1.2 Solution Statement: AgroLink RAMLP
AgroLink (RAMLP) is Nigeria’s institutional tripartite commodity trading, collateralized haulage telematics, and central-bank-regulated escrow settlement infrastructure. It connects **Producers (Smallholders & Farming Unions)**, **Commercial Off-Takers (Millers & Exporters)**, **Certified Logistics Carriers**, **Accredited Quality Inspectors (SON/NAFDAC/NSPRI)**, and **Statutory Dispute Arbitrators** into an interconnected, automated clearance network.

---

## 2. Key Stakeholder Personas & User Journeys

| Role / Persona | Representative Profile | Core Pain Point | RAMLP Value Proposition | Primary Interface |
|---|---|---|---|---|
| **Smallholder Producer** | *Mallam Ibrahim Musa* (Musa Agro Farms, Oyo) | Liquidity delays, exploitation by local middlemen, fear of non-payment. | Guaranteed 100% pre-funded escrow in Providus Custodial Vaults; instant NIBSS T+0 mobile payouts; GSM USSD/SMS fallback. | Mobile App & USSD/SMS Gateway (`*347*44#`) |
| **Institutional Off-Taker / Buyer** | *Grand Cereals & Feeds PLC / Flour Mills of Nigeria* | Batch aggregation complexity, quality variance, supply risk. | Multi-lot procurement aggregation, automated milestone escrow tranche releases, calibrated lab moisture gates. | Desktop Web Portal |
| **Haulage Carrier & Fleet Operator** | *Sikiru Alabi* (Oodua Logistics / Mack 30T) | Inter-state transit security, fuel advance liquidity, empty backhauls. | 30% instant loading advance, automated weighbridge gross-tare clearance, zero-waste backhaul job pairing. | Mobile Dispatch Terminal & Desktop Fleet Portal |
| **Accredited Field Chemist / Inspector** | *Engr. Folake Adeleke* (NAFDAC/NIS Field Inspector) | Paper-based field logs, vulnerability to falsified grade certs. | NIRS digital moisture spectrometry probe syncing, dual weighbridge ANPR sync, cryptographic touch/token sign-off. | Mobile Terminal & Desktop Lab Portal |
| **Statutory Arbitrator & Custodial Trustee** | *Barr. Ahmad Aliyu, SAN* (High Court Arbitrator / Providus) | Interminable litigation cycles for agricultural spoilage. | Legally enforceable liquidation awards under Arbitration & Mediation Act 2023; one-tap instant 2FA escrow disbursement. | Desktop Legal Decree & Ledger Portal |

---

## 3. System Architecture & Escrow Financial Model

### 3.1 Tripartite Escrow Vault Structure
Under CBN regulatory oversight, buyer capital is locked into segregated custodial escrow vaults (Providus Bank Custodial Trust & Stanbic IBTC Guaranteed Buffer) prior to haulier dispatch:
- **Tranche 1 (10% - 30%): Outbound Dispatch Advance**  
  *Trigger*: Producer harvest loaded, origin weighbridge tare-gross certified, driver e-Waybill generated. Disbursed directly to farmer/carrier to cover handling and transit operating costs.
- **Tranche 2 (60% - 70%): Destination Weighbridge & Quality Assay Gate**  
  *Trigger*: Consignment gates in at destination facility. Gross-tare weight verified via automated IoT ANPR weighbridge (within ≤1.0% evaporation tolerance). Moisture spectrometry confirms NIS compliance (≤12.5% for grains). Disbursed instantly via NIBSS RTGS.
- **Tranche 3 (10% - 30%): Destination Mill Discharge & Final Acceptance**  
  *Trigger*: Silo offloading complete, silo receiving receipt digitally signed by buyer procurement officer.

### 3.2 Dual-Channel Access Architecture
1. **High-Fidelity Smartphone & Web Portals**: Built with responsive layouts, WCAG AAA daylight-optimized contrast, and cryptographic verification badges.
2. **Offline GSM USSD & Push SMS Engine (`*347*44#` / Shortcode `34744`)**: Low-latency cellular engine providing interactive menu sessions on KaiOS and legacy GSM feature phones, backed by multi-lingual IVR (Hausa, Yorùbá, Igbo, Nigerian Pidgin).

---

## 4. Complete Screen Portfolio & Functional Mapping

The platform encompasses **17 production-grade interfaces and interactive terminals** across mobile and desktop form factors:

### 4.1 Producer Experience (Mobile First & Offline)
1. **Farmer Mobile Dashboard & Market Hub** (`SCREEN_23`): Aggregated farmgate valuation, regional crop price indices, weather alerts, quick-action tiles for harvest listings and active waybills.
2. **Farmer My Products & Active Listings** (`SCREEN_11`): Segmented farmgate lot tracker (Maize, Export Yam, Smoked Catfish, Cassava) featuring real-time buyer bid counters and price updating.
3. **Farmer Add Produce Harvest Listing Modal** (`SCREEN_13`): 3-step listing flow with multi-angle crop cut verification camera upload, grade specification, and Bodija market price benchmarks.
4. **Farmer Sales & Payouts Ledger** (`SCREEN_10`): Disbursed liquidation history (₦4.62M settled), in-transit escrow balances, Providus linked account overview, and downloadable tax-exempt statements.
5. **Farmer Orders & Live Haulage Waybill Tracking** (`SCREEN_8`): Real-time transit corridor monitoring with GPS route tracking (Iseyin Hub → Ikeja), driver telematics, and milestone tranche badges.
6. **NIBSS Interactive Settlement Receipt & QR Slip** (`SCREEN_9`): Regulated bank receipt modal with cryptographic SHA-256 seal, instant QR verification, and WhatsApp sharing.
7. **Farmer SMS & USSD Offline Gateway Terminal** (`SCREEN_4`): Interactive GSM feature phone terminal simulating `*347*44#` menus, 0800-AGROLINK vernacular IVR hotline, and SMS push transaction feeds.

### 4.2 Buyer & Procurement Suite (Desktop)
8. **RAMLP Public Marketing Homepage** (`SCREEN_20`): Institutional landing page highlighting CBN licensing, live commodity spot prices, multi-role registration gateways, and escrow statistics.
9. **Unified Role Registration & Authentication Portal** (`SCREEN_18`): Single sign-on portal with role selector pills, BVN/NIN institutional verification, and Providus virtual NUBAN binding.
10. **Buyer Wholesale Commodity Exchange** (`SCREEN_22`): Institutional trading floor with live order books, regional origin filters, certified grade tags, and volume off-take bids.
11. **Buyer Batch Procurement & Price Negotiation Portal** (`SCREEN_12`): Multi-lot aggregator combining diverse supplier lots into 250 MT batches with real-time counter-bidding console and Providus bonded vault checks.
12. **Buyer Escrow Checkout & Milestone Payment Settlement** (`SCREEN_21`): Tranche pre-funding calculator, insurance underwriter binder (Sovereign Trust), and statutory tax-exemption verification.
13. **Buyer Settlement & Escrow Reconciliation Ledger** (`SCREEN_7`): Enterprise treasury master ledger with live NIBSS clearing feeds, dual-signatory cryptographic authorization console, and automated audit logs.

### 4.3 Logistics & Quality Verification Suite (Mobile & Desktop)
14. **Logistics Fleet Waybill & Haulage Dispatch Portal** (`SCREEN_19` [Desktop]): Enterprise dispatch dashboard tracking multi-corridor transit fleets, route speed governors, and weighbridge integrations.
15. **Carrier Logistics Mobile Dispatch & e-Waybill Terminal** (`SCREEN_15` [Mobile]): Driver-centric terminal with live GPS corridors, gross-tare slips, security seal verification (`9841A-F`), and matched zero-waste return backhaul jobs.
16. **Quality Inspection & Moisture Lab Sign-off Portal** (`SCREEN_17` [Desktop]): Desktop analytical workbench linking NIRS spectrometer hardware, dual-weighbridge tolerance variance matrices, and laboratory certificates.
17. **Quality Inspection & Lab Sign-off Mobile Terminal** (`SCREEN_14` [Mobile]): On-site inspector app with circular moisture dial, aflatoxin/chaff pass indicators, camera photo evidence streams, and YubiKey NFC e-signatures.

### 4.4 Governance, Legal Arbitration & Regulatory Decree
18. **Admin Dispute & Escrow Freeze Review Portal** (`SCREEN_16` [Desktop]): Real-time dispute dashboard for investigating quality variance claims, viewing corridor weather telemetry, and initiating arbitration.
19. **Statutory High Court Arbitrator Escrow Release Certificate & Liquidation Decree** (`SCREEN_2` [Desktop]): Formal legal judgment screen pursuant to Section 53 of the *Arbitration and Mediation Act 2023*, detailing forensic tribunal findings, tripartite recitals, insurance indemnity allocation, and 2FA Providus vault liquidation orders.

---

## 5. Design System Specifications (`AgroLink Continental`)

| Visual Token | Value / Specification | Functional Rationale |
|---|---|---|
| **Primary Theme Color** | `#176B3A` (Deep Forest Green) | Institutional authority, agricultural vitality, aligns with Nigerian sovereign and CBN branding. |
| **Secondary Accent** | `#F4B942` (Harvest Amber Gold) | Signals financial security, active escrow locking, and in-transit haulage attention states. |
| **Surface Base** | `#F8FAF6` / `#F3FCEF` (Natural Tint) | Specifically calibrated to reduce harsh screen glare under outdoor direct sunlight at farmgate hubs. |
| **Surface Container** | `#FFFFFF` (Pure White) | Provides crisp card elevation, visual hierarchy, and separation of data tables. |
| **Primary Typography** | `Manrope` (Sans-Serif Variable) | Exceptional geometric clarity with tabular numerals critical for financial figures (`₦`) and tonnage (`MT`). |
| **High Contrast Text** | `#0F2417` (Deep Jungle Charcoal) | Exceeds WCAG AAA requirements (14.2:1 contrast ratio) ensuring legibility in bright rural daylight. |
| **Border Radii** | `8px` to `16px` (`ROUND_EIGHT`) | Balances enterprise financial trust with approachable modern mobile accessibility. |

---

## 6. Technical Requirements & Regulatory Compliance

1. **Security & Cryptography**:
   - SHA-256 cryptographic hashing of every inspection record, weighbridge certificate, and arbitration award.
   - Dual-token hardware signing (FIPS 140-2 / YubiKey NFC) for high-value escrow liquidations (>₦5,000,000).
2. **Banking & Core Settlement Integration**:
   - Providus Bank Custodial Escrow API with direct NIBSS Instant Payment (NIP) webhook triggers for T+0 settlement.
   - Dedicated Virtual Escrow NUBAN generation per procurement batch.
3. **Hardware Telematics & IoT Interfaces**:
   - Automated Number Plate Recognition (ANPR) camera feed integration at partner weighbridges.
   - NIRS (Near-Infrared Spectroscopy) moisture probe Bluetooth/NFC sync.
4. **Regulatory Audit Readiness**:
   - Automated calculation of 0% withholding tax deductions pursuant to the Agricultural Primary Produce Exemption Act.
   - Downloadable SHA-256 signed PDFs and Certified True Copy (CTC) decree exports for Ministry and High Court registries.

---

## 7. Success Metrics (KPIs)

- **Escrow Settlement Velocity**: Reduction of average farmer payout wait time from 21 days to < 2 hours post destination silo sign-off.
- **Dispute Resolution Cycle**: Resolution of transit and moisture quality disputes in < 48 hours via binding digital arbitration awards.
- **Transit Loss Minimization**: Weight loss variance held strictly below ≤1.0% statutory evaporation tolerance.
- **Rural Inclusivity**: >40% of smallholder trade actions authorized through offline USSD (`*347*44#`) and SMS push confirmation gateways.
- **Logistics Efficiency**: >35% reduction in empty freight hauls achieved through integrated zero-waste backhaul pairing.
