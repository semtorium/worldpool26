/**
 * ABS WorldPool — Metadata JSON Generator
 * 2026 FIFA World Cup — Official 48-team lineup
 *
 * Kullanım: node generate.js
 */

const fs   = require("fs");
const path = require("path");

const IMAGE_BASE_URL = "https://flagcdn.com/w640/";
const IMAGE_SUFFIX   = ".png";
const CONTRACT_DESC  = "ABS WorldPool Nations Cup entry NFT. Hold this token to earn a share of the prize pool if your country wins the 2026 FIFA World Cup.";

const COUNTRIES = [
  // Group A
  { id:  1, name: "Mexico",           flagCode: "mx",     group: "A", continent: "CONCACAF" },
  { id:  2, name: "South Africa",     flagCode: "za",     group: "A", continent: "CAF"      },
  { id:  3, name: "South Korea",      flagCode: "kr",     group: "A", continent: "AFC"      },
  { id:  4, name: "Czech Republic",   flagCode: "cz",     group: "A", continent: "UEFA"     },
  // Group B
  { id:  5, name: "Canada",           flagCode: "ca",     group: "B", continent: "CONCACAF" },
  { id:  6, name: "Bosnia-Herz.",     flagCode: "ba",     group: "B", continent: "UEFA"     },
  { id:  7, name: "Qatar",            flagCode: "qa",     group: "B", continent: "AFC"      },
  { id:  8, name: "Switzerland",      flagCode: "ch",     group: "B", continent: "UEFA"     },
  // Group C
  { id:  9, name: "Brazil",           flagCode: "br",     group: "C", continent: "CONMEBOL" },
  { id: 10, name: "Morocco",          flagCode: "ma",     group: "C", continent: "CAF"      },
  { id: 11, name: "Haiti",            flagCode: "ht",     group: "C", continent: "CONCACAF" },
  { id: 12, name: "Scotland",         flagCode: "gb-sct", group: "C", continent: "UEFA"     },
  // Group D
  { id: 13, name: "United States",    flagCode: "us",     group: "D", continent: "CONCACAF" },
  { id: 14, name: "Paraguay",         flagCode: "py",     group: "D", continent: "CONMEBOL" },
  { id: 15, name: "Australia",        flagCode: "au",     group: "D", continent: "AFC"      },
  { id: 16, name: "Turkey",           flagCode: "tr",     group: "D", continent: "UEFA"     },
  // Group E
  { id: 17, name: "Germany",          flagCode: "de",     group: "E", continent: "UEFA"     },
  { id: 18, name: "Curacao",          flagCode: "cw",     group: "E", continent: "CONCACAF" },
  { id: 19, name: "Ivory Coast",      flagCode: "ci",     group: "E", continent: "CAF"      },
  { id: 20, name: "Ecuador",          flagCode: "ec",     group: "E", continent: "CONMEBOL" },
  // Group F
  { id: 21, name: "Netherlands",      flagCode: "nl",     group: "F", continent: "UEFA"     },
  { id: 22, name: "Japan",            flagCode: "jp",     group: "F", continent: "AFC"      },
  { id: 23, name: "Sweden",           flagCode: "se",     group: "F", continent: "UEFA"     },
  { id: 24, name: "Tunisia",          flagCode: "tn",     group: "F", continent: "CAF"      },
  // Group G
  { id: 25, name: "Belgium",          flagCode: "be",     group: "G", continent: "UEFA"     },
  { id: 26, name: "Egypt",            flagCode: "eg",     group: "G", continent: "CAF"      },
  { id: 27, name: "Iran",             flagCode: "ir",     group: "G", continent: "AFC"      },
  { id: 28, name: "New Zealand",      flagCode: "nz",     group: "G", continent: "OFC"      },
  // Group H
  { id: 29, name: "Spain",            flagCode: "es",     group: "H", continent: "UEFA"     },
  { id: 30, name: "Cape Verde",       flagCode: "cv",     group: "H", continent: "CAF"      },
  { id: 31, name: "Saudi Arabia",     flagCode: "sa",     group: "H", continent: "AFC"      },
  { id: 32, name: "Uruguay",          flagCode: "uy",     group: "H", continent: "CONMEBOL" },
  // Group I
  { id: 33, name: "France",           flagCode: "fr",     group: "I", continent: "UEFA"     },
  { id: 34, name: "Senegal",          flagCode: "sn",     group: "I", continent: "CAF"      },
  { id: 35, name: "Iraq",             flagCode: "iq",     group: "I", continent: "AFC"      },
  { id: 36, name: "Norway",           flagCode: "no",     group: "I", continent: "UEFA"     },
  // Group J
  { id: 37, name: "Argentina",        flagCode: "ar",     group: "J", continent: "CONMEBOL" },
  { id: 38, name: "Algeria",          flagCode: "dz",     group: "J", continent: "CAF"      },
  { id: 39, name: "Austria",          flagCode: "at",     group: "J", continent: "UEFA"     },
  { id: 40, name: "Jordan",           flagCode: "jo",     group: "J", continent: "AFC"      },
  // Group K
  { id: 41, name: "Portugal",         flagCode: "pt",     group: "K", continent: "UEFA"     },
  { id: 42, name: "DR Congo",         flagCode: "cd",     group: "K", continent: "CAF"      },
  { id: 43, name: "Uzbekistan",       flagCode: "uz",     group: "K", continent: "AFC"      },
  { id: 44, name: "Colombia",         flagCode: "co",     group: "K", continent: "CONMEBOL" },
  // Group L
  { id: 45, name: "England",          flagCode: "gb-eng", group: "L", continent: "UEFA"     },
  { id: 46, name: "Croatia",          flagCode: "hr",     group: "L", continent: "UEFA"     },
  { id: 47, name: "Ghana",            flagCode: "gh",     group: "L", continent: "CAF"      },
  { id: 48, name: "Panama",           flagCode: "pa",     group: "L", continent: "CONCACAF" },
];

const outDir = path.join(__dirname, "json");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

COUNTRIES.forEach(({ id, name, flagCode, group, continent }) => {
  const metadata = {
    name: `${name} — 2026 World Cup`,
    description: CONTRACT_DESC,
    image: `${IMAGE_BASE_URL}${flagCode}${IMAGE_SUFFIX}`,
    external_url: "https://absworldpool.xyz",
    attributes: [
      { trait_type: "Country",    value: name       },
      { trait_type: "Continent",  value: continent  },
      { trait_type: "Group",      value: `Group ${group}` },
      { trait_type: "Token ID",   value: String(id) },
      { trait_type: "Tournament", value: "2026 FIFA World Cup" },
    ],
  };
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(metadata, null, 2), "utf8");
  console.log(`✓ ${id}.json — [Group ${group}] ${name}`);
});

console.log(`\n✅ ${COUNTRIES.length} metadata files generated → metadata/json/`);
