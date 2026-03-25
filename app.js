let db;
let formula = [];
let materials = [];
let currentFormulaName = "";

const request = indexedDB.open("PerfumeDB", 1);

request.onupgradeneeded = function(e) {
  db = e.target.result;
  db.createObjectStore("materials", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("formulas", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = function(e) {
  db = e.target.result;
  renderMaterials();
  renderSaved();
};

function toggleTheme() {
  document.body.classList.toggle("dark-mode");

  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("themePerfumeRecipe", isDark ? "dark" : "light");
}

window.onload = function() {
  const saved = localStorage.getItem("themePerfumeRecipe");

  // padrão = claro
  if (saved === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
};

function showTab(evt, tab) {
  document.querySelectorAll('.section').forEach(s => s.style.display='none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  evt.currentTarget.classList.add('active');
  document.getElementById(tab).style.display='block';
}

function formatMaterialName(m) {
  const date = new Date(m.validade);
  const mes = String(date.getMonth()+1).padStart(2,'0');
  const ano = date.getFullYear();
  return `${m.name} (${m.dilution}%) - val: ${mes}-${ano}`;
}

function addMaterial() {
  const name = document.getElementById('materialName').value;
  const dilution = document.getElementById('dilution').value || 0;
  const validade = document.getElementById('validade').value;
  const categoria = document.getElementById('categoria').value;
  if (!name || !validade) return;

  const tx = db.transaction("materials", "readwrite");
  tx.objectStore("materials").add({ name, dilution, validade, categoria });

  tx.oncomplete = () => {
    document.getElementById('materialName').value = '';
    document.getElementById('dilution').value = '';
    document.getElementById('validade').value = '';
    document.getElementById('categoria').selectedIndex = 0;
    renderMaterials();
  };
}

function renderMaterials() {
  const tbody = document.getElementById('materialsTable');
  const select = document.getElementById('materialSelect');
  tbody.innerHTML = '';
  select.innerHTML = '';

  const tx = db.transaction("materials", "readonly");
  const store = tx.objectStore("materials");

  let items = [];

  store.openCursor().onsuccess = function(e) {
    const cursor = e.target.result;
    if (cursor) {
      items.push(cursor.value);
      cursor.continue();
    } else {
      items.sort((a,b)=>{
        if(a.categoria < b.categoria) return -1;
        if(a.categoria > b.categoria) return 1;
        return a.name.localeCompare(b.name);
      });

      materials = items;

      let currentCat = '';

      const classMap = {
        'Cítrico':'category-citrico',
        'Floral':'category-floral',
        'Amadeirado':'category-amadeirado',
        'Musk':'category-musk',
        'Ambarado':'category-ambarado',
        'Gourmand':'category-gourmand',
        'Aromático':'category-aromatico',
        'Verde':'category-verde'
      };

      items.forEach(m=>{
        if(m.categoria !== currentCat){
          currentCat = m.categoria;
          const catClass = classMap[currentCat] || '';
          tbody.innerHTML += `<tr class="category-row ${catClass}"><td colspan="2">${currentCat}</td></tr>`;
        }

        const display = formatMaterialName(m);
        tbody.innerHTML += `<tr><td>${display}</td><td><button class='danger' onclick="removeMaterial(${m.id})">Excluir</button></td></tr>`;
        select.innerHTML += `<option value="${m.id}">${m.name} (${m.dilution}%)</option>`;
      });
    }
  };
}

function removeMaterial(id) {
  const tx = db.transaction("materials", "readwrite");
  tx.objectStore("materials").delete(id);
  tx.oncomplete = renderMaterials;
}

function addToFormula() {
  const note = document.getElementById('noteSelect').value;

  const select = document.getElementById('materialSelect');
  const materialId = parseInt(select.value);
  const materialName = select.options[select.selectedIndex].text;

  const weightInput = document.getElementById('weight');
  const weight = parseFloat(weightInput.value);

  console.log("SELECT VALUE:", select.value);
console.log("PARSED ID:", materialId);

  if (!weight || isNaN(materialId)) return;

  formula.push({
    materialId,
    materialName,
    weight,
    note
  });

  weightInput.value = '';

  renderFormula();
}

function getMaterialById(id) {
  return materials.find(m => m.id === id);
}

function renderFormula() {
  const tbody = document.getElementById('formulaTable');
  tbody.innerHTML = '';

  const total = formula.reduce((sum, f) => sum + f.weight, 0);

  // 🔥 total de matéria pura
  const totalRaw = formula.reduce((sum, f) => {
    const mat = getMaterialById(f.materialId);
    const dilution = mat ? parseFloat(mat.dilution) : 100;

    return sum + (f.weight * (dilution / 100));
  }, 0);

  const groups = {
    topo: formula.filter(f => f.note === 'topo'),
    meio: formula.filter(f => f.note === 'meio'),
    fundo: formula.filter(f => f.note === 'fundo')
  };

  const groupLabels = {
    topo: 'Notas de Topo',
    meio: 'Notas de Meio',
    fundo: 'Notas de Fundo'
  };

  Object.keys(groups).forEach(groupKey => {
    const groupItems = groups[groupKey];

    const groupTotal = groupItems.reduce((sum, f) => sum + f.weight, 0);
    const groupPerc = total ? (groupTotal / total * 100).toFixed(2) : 0;

    tbody.innerHTML += `
      <tr class="group-header">
        <td colspan="7">
          <strong>${groupLabels[groupKey]}: (${groupPerc}% do total)</strong>
        </td>
      </tr>
    `;

    groupItems.forEach((f) => {
      const mat = getMaterialById(f.materialId);

      const dilution = mat ? parseFloat(mat.dilution) : 100;

      const perc = total ? (f.weight / total * 100).toFixed(2) : 0;
      const parts = total ? (f.weight / total * 1000).toFixed(0) : 0;

      // 🔥 RAW
      const raw = f.weight * (dilution / 100);

      // 🔥 % REAL
      const rawPerc = totalRaw ? (raw / totalRaw * 100).toFixed(2) : 0;

      const realIndex = formula.indexOf(f);

      tbody.innerHTML += `
        <tr>
          <td>${f.materialName}</td>

          <td>
            <input type="number" step="0.01" value="${f.weight}"
              onchange="updateWeight(${realIndex}, this.value)">
          </td>

          <td>${perc}</td>
          <td>${parts}</td>

          <td>${raw.toFixed(3)}</td>
          <td>${rawPerc}%</td>

          <td>
            <button class="danger" onclick="removeItem(${realIndex})">Excluir</button>
          </td>
        </tr>
      `;
    });
  });
}

function updateWeight(index, value) {
  formula[index].weight = parseFloat(value);
  renderFormula();
}

function removeItem(index) {
  formula.splice(index, 1);
  renderFormula();
}

function saveFormula() {
  const name = prompt("Nome da fórmula:");
  if (!name) return;
  currentFormulaName = name;
  const tx = db.transaction("formulas", "readwrite");
  tx.objectStore("formulas").add({ name, formula });
  tx.oncomplete = renderSaved;
}

function renderSaved() {
  const ul = document.getElementById('savedFormulas');
  ul.innerHTML = '';

  const tx = db.transaction("formulas", "readonly");
  const store = tx.objectStore("formulas");

  store.openCursor().onsuccess = function(e) {
    const cursor = e.target.result;
    if (cursor) {
      const f = cursor.value;
      ul.innerHTML += `<li>
        ${f.name}
        <button onclick="loadFormula(${f.id}, '${f.name}')">Carregar</button>
        <button class='danger' onclick="deleteFormula(${f.id})">Excluir</button>
      </li>`;
      cursor.continue();
    }
  };
}

function deleteFormula(id) {
  if (!confirm("Deseja realmente excluir esta fórmula?")) return;
  const tx = db.transaction("formulas", "readwrite");
  tx.objectStore("formulas").delete(id);
  tx.oncomplete = renderSaved;
}

function loadFormula(id, name) {
  const tx = db.transaction("formulas", "readonly");
  const store = tx.objectStore("formulas");
  const req = store.get(id);
  req.onsuccess = function() {
    formula = req.result.formula;
    currentFormulaName = name;
    renderFormula();
  };
}

function exportBackup() {
  const data = { materials: [], formulas: [] };

  const tx1 = db.transaction("materials", "readonly");
  tx1.objectStore("materials").openCursor().onsuccess = e => {
    const c = e.target.result;
    if (c) { data.materials.push(c.value); c.continue(); }
  };

  const tx2 = db.transaction("formulas", "readonly");
  tx2.objectStore("formulas").openCursor().onsuccess = e => {
    const c = e.target.result;
    if (c) { data.formulas.push(c.value); c.continue(); }
  };

  setTimeout(() => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'perfume_backup.json';
    a.click();
  }, 500);
}

function importBackup(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const data = JSON.parse(e.target.result);

    const tx = db.transaction(["materials","formulas"], "readwrite");
    const mStore = tx.objectStore("materials");
    const fStore = tx.objectStore("formulas");

    data.materials.forEach(m => mStore.add(m));
    data.formulas.forEach(f => fStore.add(f));

    tx.oncomplete = function() {
      alert("Backup importado com sucesso!");
      renderMaterials();
      renderSaved();
    };
  };

  reader.readAsText(file);
}

function exportPDF() {
  if (!formula.length) {
    alert("A fórmula está vazia.");
    return;
  }

  const nome = currentFormulaName || "Fórmula sem nome";

  const agora = new Date();
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const dataFormatada = `${agora.getDate()} de ${meses[agora.getMonth()]} ${agora.getFullYear()} - ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;

  const total = formula.reduce((sum, f) => sum + f.weight, 0);

  const totalRaw = formula.reduce((sum, f) => {
    const mat = getMaterialById(f.materialId);
    const dilution = mat ? parseFloat(mat.dilution) : 100;
    return sum + (f.weight * (dilution / 100));
  }, 0);

  let linhas = "";

  formula.forEach(f => {
    const mat = getMaterialById(f.materialId);
    const dilution = mat ? parseFloat(mat.dilution) : 100;

    const perc = total ? (f.weight / total * 100).toFixed(2) : 0;
    const parts = total ? (f.weight / total * 1000).toFixed(0) : 0;

    const raw = f.weight * (dilution / 100);
    const rawPerc = totalRaw ? (raw / totalRaw * 100).toFixed(2) : 0;

    linhas += `
      <tr>
        <td>${f.materialName} (${dilution}%)</td>
        <td class="num">${f.weight.toFixed(2)}</td>
        <td class="num">${perc}%</td>
        <td class="num">${parts}</td>
        <td class="num">${raw.toFixed(3)}</td>
        <td class="num">${rawPerc}%</td>
      </tr>
    `;
  });

  const html = `
    <html>
    <head>
      <title>${nome}</title>
      <style>
        body { font-family: Arial; padding: 30px; color:#222; }

        h1 { margin-bottom: 5px; }
        .data { color: #666; margin-bottom: 20px; }

        table {
          width:100%;
          border-collapse: collapse;
          margin-top:10px;
          font-size: 14px;
        }

        th {
          text-align:left;
          padding:10px;
          background:#f2f2f2;
          border:1px solid #ccc;
        }

        td {
          padding:8px;
          border:1px solid #ddd;
        }

        .num {
          text-align:right;
        }

        tr:nth-child(even) {
          background:#fafafa;
        }

        .header {
          border-bottom:2px solid #000;
          margin-bottom:10px;
          padding-bottom:5px;
        }

      </style>
    </head>
    <body>

      <div class="header">
        <h1>${nome}</h1>
        <h4>Fórmula criada no Perfume Recipe CAD</h4>
        <div class="data">${dataFormatada}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>g</th>
            <th>%</th>
            <th>Partes</th>
            <th>RAW (g)</th>
            <th>% REAL</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>

    </body>
    </html>[]
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();

  win.onload = () => {
    win.print();
  };
}

// ================= PWA Service Work =================
function showUpdateBanner() {
  document.getElementById("updateBanner").style.display = "block";
}

function updateApp() {
  if (newWorker) {
    newWorker.postMessage({ action: "skipWaiting" });
  }
  window.location.reload();
}

let newWorker;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {

    // Detecta nova versão
    reg.onupdatefound = () => {
      newWorker = reg.installing;

      newWorker.onstatechange = () => {
        if (newWorker.state === "installed") {

          // Se já existe app rodando → atualização disponível
          if (navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        }
      };
    };

  });
}

window.addMaterial = addMaterial;
window.removeMaterial = removeMaterial;
window.addToFormula = addToFormula;
window.updateWeight = updateWeight;
window.removeItem = removeItem;
window.saveFormula = saveFormula;
window.loadFormula = loadFormula;
window.deleteFormula = deleteFormula;
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.exportPDF = exportPDF;
window.showTab = showTab;
window.toggleTheme = toggleTheme;
window.updateApp = updateApp;
