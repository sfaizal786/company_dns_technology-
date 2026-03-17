const express = require("express");
const path = require("path");
const dns = require("dns").promises;
const cors = require("cors");

// 🔥 Force Google DNS
require("dns").setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "public")));


// ================= CONFIG =================

// Words that are NOT technologies
const STOP_WORDS = new Set([
  "_spf", "spf", "protection", "email", "com", "net", "org", "co",
  "redirect", "mg", "asv", "stspg"
]);

const VOWEL_RATIO_THRESHOLD = 0.2;


// ================= HELPERS =================

// Clean technology name
function formatTech(raw) {
  if (!raw) return "";

  let cleaned = raw
    .replace(/domain|verification|verify|challenge|site|ci|customer|service|desk/gi, "")
    .replace(/[0-9]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/[^a-zA-Z ]/g, " ")
    .trim();

  const word = cleaned.split(/\s+/)[0];
  if (!word) return "";

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}


// Extract name from domain
function extractNameFromDomain(domain) {
  const parts = domain.split(".");
  return parts.find(p => !STOP_WORDS.has(p)) || parts[0];
}


// Smart filter
function isValidTech(word) {
  const w = word.toLowerCase();

  if (w.length <= 3) return false;
  if (/[0-9]/.test(w)) return false;
  if (w.length > 12) return false;
  if (STOP_WORDS.has(w)) return false;

  const vowels = w.match(/[aeiou]/g) || [];
  const ratio = vowels.length / w.length;

  if (ratio < VOWEL_RATIO_THRESHOLD) return false;

  return true;
}


// ================= EXTRACTION =================

// SPF include
function extractFromIncludes(text, set) {
  const includes = text.match(/include:([a-z0-9._%-]+)/g);
  if (!includes) return;

  includes.forEach(i => {
    let domain = i.replace("include:", "");
    domain = domain.replace(/%\{.*?\}/g, "");

    const name = extractNameFromDomain(domain);
    if (name) set.add(formatTech(name));
  });
}


// key=value (docker-verification, etc.)
function extractFromKeyValues(text, set) {
  const matches = text.match(/[a-z0-9_-]+=/g);
  if (!matches) return;

  matches.forEach(kv => {
    let key = kv.replace("=", "");

    key = key.replace(/-?domainverification/g, "");
    key = key.replace(/verification/g, "");

    if (key) set.add(formatTech(key));
  });
}


// ALL domains (IMPORTANT for SPF: vali.email, outlook.com)
function extractFromDomains(text, set) {
  const matches = text.match(/[a-z0-9.-]+\.[a-z]{2,}/g);
  if (!matches) return;

  matches.forEach(domain => {
    const name = extractNameFromDomain(domain);
    if (name) set.add(formatTech(name));
  });
}


// ================= MAIN =================

function extractTech(records) {
  const set = new Set();

  records.forEach(record => {
    const text = record.join(" ").toLowerCase();

    extractFromIncludes(text, set);
    extractFromKeyValues(text, set);
    extractFromDomains(text, set);
  });

  return [...set].filter(t => t && isValidTech(t));
}


// ================= API =================

app.post("/api/tech", async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain required" });
  }

  try {
    const records = await dns.resolveTxt(domain);
    const tech = extractTech(records);

    res.json({
      domain,
      technologies: tech.length ? tech : ["No tech found"]
    });

  } catch (err) {
    console.log("DNS ERROR:", err.message);

    res.json({
      domain,
      technologies: ["No TXT records"]
    });
  }
});


// ================= START =================

app.listen(3000, () => {
  console.log("Server running on port 3000");
});