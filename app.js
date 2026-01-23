function formatRupiah(n) {
  return "Rp " + n.toLocaleString("id-ID") + ",-";
}

const data = {
  spsAqua: [
    ["CRG", "All SKU", 652000],
    ["CTR", "All SKU", 532000],
    ["MKS", "All SKU", 767000],
    ["CHR", "All SKU", 612000],
    ["KEDEP", "All SKU", 656500],
    ["CJR", "AQ 1500 ML", 943000],
    ["CIANJUR", "AQ 600 ML", 943000],
    ["CJR", "AQ 1500 ML", 749000],
    ["CIANJUR", "AQ 600 ML", 749000],
    ["CJR", "AQ 330 ML", 943000],
    ["CIANJUR", "AQ 1500 ML", 823000],
    ["CJR", "AQ 330 ML", 1167000],
    ["DEPO JONGGOL", "All SKU", 714000],
  ],

  galonAqua: [
    ["TBP", "432", 605000],
    ["TBP", "528", 622000],
    ["TBP", "720", 794000],
    ["TBP", "960", 809000],
    ["TBP", "1008", 820000],
    ["MKS", "432", 679000],
    ["MKS", "528", 696000],
    ["MKS", "960 LASAH", 859000],
    ["MKS", "960 JUGRACK", 821000],
    ["MKS", "1008", 870000],
    ["MKS", "720", 844000],
    ["CHG", "960 JUGRACK", 633000],
    ["CRG", "960 JUGRACK", 652000],
  ],

  spsVit: [
    ["TMP", "VT 200 ML", 642000],
    ["TMP", "VT 550 ML", 607000],
    ["TMP", "VT MOSKA 220", 642000],
    ["TMP", "VT 1500 ML", 630000],
    ["GIT", "VT 330 ML", 2163000],
  ],

  galonVit: [
    ["BTA", "528", 463000],
    ["BTA", "768", 574000],
    ["BTA", "960", 501000],
    ["SSS", "528", 457000],
    ["SSS", "768", 568000],
  ]
};

function render(target, rows) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>Pabrik</th>
          <th>Muatan</th>
          <th>Uang Ritase</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(r => {
    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td class="uang">${formatRupiah(r[2])}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById(target).innerHTML = html;
}

render("sps-aqua", data.spsAqua);
render("galon-aqua", data.galonAqua);
render("sps-vit", data.spsVit);
render("galon-vit", data.galonVit);

/* CLOCK */
function updateTime() {
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const d = new Date();

  document.getElementById("datetime").innerText =
    `${hari[d.getDay()]} ${String(d.getDate()).padStart(2,"0")}.` +
    `${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ` +
    `${String(d.getHours()).padStart(2,"0")}:` +
    `${String(d.getMinutes()).padStart(2,"0")}:` +
    `${String(d.getSeconds()).padStart(2,"0")} WIB`;
}

setInterval(updateTime, 1000);
updateTime();
