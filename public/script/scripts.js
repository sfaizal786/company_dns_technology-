document.addEventListener("DOMContentLoaded", () => {

const singleTab = document.getElementById("singleTab");
const bulkTab = document.getElementById("bulkTab");

const singleForm = document.getElementById("singleForm");
const bulkForm = document.getElementById("bulkForm");

singleTab.addEventListener("click", () => {
  singleForm.style.display = "flex";
  bulkForm.style.display = "none";
  singleTab.classList.add("active");
  bulkTab.classList.remove("active");
});

bulkTab.addEventListener("click", () => {
  singleForm.style.display = "none";
  bulkForm.style.display = "flex";
  bulkTab.classList.add("active");
  singleTab.classList.remove("active");
});

const fileInput = document.getElementById("csvFile");
const fileName = document.getElementById("fileName");

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    fileName.textContent = fileInput.files[0].name;
  }
});

const tbody = document.querySelector("tbody");
const downloadBtn = document.getElementById("downloadBtn");

let tableData = [];

function fixDomain(input) {
  let domain = input.toLowerCase().trim();
  if (!domain.includes(".")) {
    domain += ".com";
  }
  return domain;
}


// 🔹 SINGLE SEARCH
singleForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = singleForm.querySelector("button");
  btn.classList.add("loading");

  const input = singleForm.querySelector("input").value;
  if (!input) {
    btn.classList.remove("loading");
    return;
  }

  const domain = fixDomain(input);

  try {
    const res = await fetch("/api/tech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain })
    });

    const data = await res.json();
    addRow(data.domain, data.technologies);
  } catch {
    alert("Error fetching data");
  }

  btn.classList.remove("loading");
});


// 🔹 BULK SEARCH
bulkForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = bulkForm.querySelector("button");
  btn.classList.add("loading");

  const file = fileInput.files[0];
  if (!file) {
    btn.classList.remove("loading");
    return;
  }

  const text = await file.text();

  let companies = text.split("\n")
    .map(c => c.trim())
    .filter(c => c.length > 0);

  if (companies[0].toLowerCase().includes("company")) {
    companies.shift();
  }

  try {
    for (let company of companies) {
      const domain = fixDomain(company);

      const res = await fetch("/api/tech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain })
      });

      const data = await res.json();
      addRow(data.domain, data.technologies);
    }
  } catch {
    alert("Bulk processing error");
  }

  btn.classList.remove("loading");
});


// 🔥 ADD ROW (VERTICAL STYLE)
function addRow(company, techArray) {

  techArray.forEach((tech, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${tableData.length + 1}</td>
      <td>${company}</td>
      <td>${tech}</td>
    `;

    tbody.appendChild(row);
  });

  tableData.push({ company, tech: techArray });

  downloadBtn.style.display = "block";
}


// 🔹 DOWNLOAD BUTTON
downloadBtn.addEventListener("click", () => {
  const type = prompt("Enter format: json / csv / excel");

  if (type === "json") downloadJSON();
  else downloadCSV();
});


// 🔹 JSON DOWNLOAD
function downloadJSON() {
  const blob = new Blob(
    [JSON.stringify(tableData, null, 2)],
    { type: "application/json" }
  );
  triggerDownload(blob, "data.json");
}


// 🔥 CSV DOWNLOAD (VERTICAL FORMAT)
function downloadCSV() {
  let csv = "Company,Technology\n";

  tableData.forEach(row => {
    row.tech.forEach(tech => {
      csv += `${row.company},${tech}\n`;
    });

    // blank line between companies
    csv += "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, "data.csv");
}


// 🔹 DOWNLOAD TRIGGER
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

});