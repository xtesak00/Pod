const scritpName = "Podpory";
const author = "Aviendha/FinalMasquadre preložil";
const hcPop = window.localStorage.getItem("asc_hc_pop");

try {
  const queryParams = getQueryParams(window.location.href);
  const correctUrl =
    "overview_villages&mode=units&type=away_detail&filter_villages=1&page=-1";

  if (
    queryParams.screen !== "overview_villages" ||
    queryParams.mode !== "units" ||
    queryParams.type !== "away_detail"
  ) {
    UI.InfoMessage("Going to the troops/support overview...", 3000, "success");
    window.location = `${game_data.link_base_pure}${correctUrl}`;
  } else {
    const data = calculateSupport();

    if ($("#result_box").length <= 0) {
      $("#paged_view_content").prepend(generateOutput(data));
    }
  }
} catch (objError) {
  const dbgMsg = "Error: " + String(objError.message || objError);
  console.log(objError);
  alert(dbgMsg);
}

function getUnitName(unit) {
  if (unit === "spear") return "Kopijník";
  if (unit === "sword") return "Šermiar";
  if (unit === "axe") return "Sekerník";
  if (unit === "archer") return "Lukostrelec";
  if (unit === "spy") return "Špeh";  
  if (unit === "light") return "Ľahká jazda";
  if (unit === "marcher") return "Lukostrelec na koni";  
  if (unit === "heavy") return "Ťažká jazda";
  if (unit === "ram") return "Baranidlo";
  if (unit === "catapult") return "Katapult";  
  if (unit === "knight") return "Paladin";  
  if (unit === "snob") return "Šľachtic";
  
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

function getUnitPop(unit) {
  switch (unit) {
    case "spy":
      return 2;
    case "light":
      return 4;
    case ("marcher", "ram"):
      return 5;
    case "heavy":
      return hcPop ? parseInt(hcPop) : 4;
    case "catapult":
      return 8;
    case "snob":
      return 100;
    default:
      return 1;
  }
}

function parseVillageData(villageData) {
  if (villageData.length === 0) return {};

  const village = $(villageData).find("span.village_anchor > a").first();

  const checkboxName = $(villageData).find("input[type=checkbox]").attr("name");
  const spanId = "label_text_" + checkboxName.match(/(\d)+/)[0];
  const [player, tribe] = $(villageData.find(`#${spanId} > a`)).toArray();

  return {
    text: villageData.text(),
    playerName: $(player).text(),
    tribeName: $(tribe).text(),
    villageUrl: $(village).attr("href"),
    villageName: $(village).text(),
  };
}

function isBarb(text) {
  return text.search("(---)") !== -1;
}

function getQueryParams(url) {
  const urlParts = url.split("?");
  let queryParams = {};
  if (urlParts.length === 2) {
    urlParts[1].split("&").forEach((qs) => {
      [param, value] = qs.split("=");
      queryParams[param] = value;
    });
  }

  return queryParams;
}

function calculateSupport() {
  const players = { totalUnits: {}, pop: 0, tribes: {} };
  const barbs = { totalUnits: {}, pop: 0, villages: {} };
  const own = { totalUnits: {}, pop: 0, villages: {} };

  const tableRows = $("#units_table").find("tbody tr");

  tableRows.each((i, row) => {
    if ($(row).hasClass("units_away")) {
      return;
    }

    const rowData = $(row).find("td").toArray();
    const { text, playerName, tribeName, villageUrl, villageName } =
      parseVillageData($(rowData.shift()));

    if (!villageName) return;

    let tribe = null;
    let player = null;

    if (!playerName) {
      player = isBarb(text) ? barbs : own;
    } else {
      if (!players.tribes[tribeName]) {
        players.tribes[tribeName] = {
          totalUnits: {},
          pop: 0,
          players: {},
        };
      }

      tribe = players.tribes[tribeName];

      if (!tribe.players[playerName]) {
        tribe.players[playerName] = {
          totalUnits: {},
          pop: 0,
          villages: {},
        };
      }

      player = tribe.players[playerName];
    }

    if (!player.villages[villageName]) {
      player.villages[villageName] = {
        units: {},
        pop: 0,
        url: villageUrl,
      };
    }

    village = player.villages[villageName];

    //units
    for (let i = 1; i < rowData.length - 1; i++) {
      const unitName = game_data.units[i - 1];
      const unitCount = parseInt($(rowData[i]).text());
      const unitPop = unitCount * getUnitPop(unitName);

      if (!player.totalUnits[unitName]) {
        player.totalUnits[unitName] = 0;
      }

      if (!village.units[unitName]) {
        village.units[unitName] = 0;
      }

      player.totalUnits[unitName] += unitCount;
      player.pop += unitPop;
      village.units[unitName] += unitCount;
      village.pop += unitPop;

      if (tribe) {
        if (!players.totalUnits[unitName]) {
          players.totalUnits[unitName] = 0;
        }
        if (!tribe.totalUnits[unitName]) {
          tribe.totalUnits[unitName] = 0;
        }
        players.totalUnits[unitName] += unitCount;
        tribe.totalUnits[unitName] += unitCount;
        tribe.pop += unitPop;
        players.pop += unitPop;
      }
    }
  });

  return { players, own, barbs };
}

function sortByPop(data) {
  return Object.keys(data).sort((a, b) => data[b].pop - data[a].pop);
}

function generateOutput(data) {
  console.log(data);
  const playersDetails = drawTribes(drawPlayers(data.players));
  const ownDetails = drawPlayerDetails(
    data.own.totalUnits,
    data.own.pop,
    data.own.villages
  );
  const barbsDetails = drawPlayerDetails(
    data.barbs.totalUnits,
    data.barbs.pop,
    data.barbs.villages
  );

  return drawResultBox([
    drawHCPopCheckbox(),
    drawExpandableWidget(
      "own_sup_table",
      `Podpory v tvojich dedinách (Populácia: ${data.own.pop})`,
      ownDetails
    ),
    drawExpandableWidget(
      "tribes_sup_table",
      `Podpory u iných hráčov (Populácia: ${data.players.pop})`,
      playersDetails
    ),
    drawExpandableWidget(
      "barbs_sup_table",
      `Podpory v barbarských dedinách (Popolácia: ${data.barbs.pop})`,
      barbsDetails
    ),
  ]);
}

// HTML
function drawPlayerDetails(totalUnits, totalPop, villages) {
  const bgColor = "#FADC9B";

  if (totalPop === 0) {
    return `<div style="text-align: center; background-color: #f4e4bc; padding: 2px 3px">Žiadne podpory</div>`;
  }

  const sorted = sortByPop(villages);
  let villagesHTML = "";
  for (villageName of sorted) {
    villagesHTML += drawVillage(villageName, villages[villageName]);
  }

  return `<table class="vis" width="100%">
            <tbody>
                <tr class="nowrap" style="margin-bottom:10px;">
                    <td style="background-color: ${bgColor}; font-weight:bold">
                        <div style="font-weight: bold;">Celkový počet jednotiek:</div>
                        ${drawUnits(totalUnits)}
                    </td>
                </tr>
                ${villagesHTML}
            </tbody>
        </table>`;
}

function drawResultBox(content) {
  content = content.join("");
  return `<div id="result_box" style="margin: 15px 0; background: #f4e4bc; border: 1px solid; padding: 5px">
            <h3 style="text-align:center; font-weigth: bold">${scritpName}</h3>
            ${content}
            <div style="text-align: right; font-style: italic; font-size:85%; padding-right: 15px;">Created by ${author}</div>
        </div>`;
}

function drawTribes(rows) {
  return `<table class="vis" width="100%">
            <tbody>${rows}</tbody>
        </table>`;
}

function drawPlayers(players) {
  if (players.pop === 0) {
    return `<tr><td style="text-align: center" colspan=2>Žiadne podpory</td></tr>`;
  }

  const sorted = sortByPop(players.tribes);
  tribeRows = "";
  for (tribeName of sorted) {
    const tribe = players.tribes[tribeName];

    tribeName = tribeName === "" ? "Bez kmeňa" : tribeName;
    let playerDetails = "";
    let count = 0;
    const sorted = sortByPop(tribe.players);
    for (playerName of sorted) {
      if (typeof playerName !== "string") continue;

      const player = tribe.players[playerName];
      playerDetails += drawExpandableWidget(
        `${playerName.replaceAll(/[^a-zA-Z\d_-]+/g, "")}_${++count}`,
        `${playerName} (Populácia: ${player.pop})`,
        drawPlayerDetails(player.totalUnits, player.pop, player.villages)
      );
    }

    tribeRows += drawTribeDetails(
      tribeName,
      drawUnits(tribe.totalUnits),
      tribe.pop,
      playerDetails
    );
  }

  return tribeRows;
}

function drawTribeDetails(tribeName, totalUnits, pop, players) {
  return `<tr style="border-bottom: 1px solid #f4e4bc;">
            <th rowspan="2" style="width: 10%; text-align: center; font-size: 120%;">${tribeName}</th>
            <td>
                <div style="font-weight: bold;">Celkový počet jednotiek:</div>
                ${totalUnits} (${pop} pop)
            </td>
        </tr>
        <tr>
            <td>
                <div style="font-weight: bold;">Units per Player:</div>
                ${players}
            </td>
        </tr>`;
}

function drawUnits(units) {
  let output = "";
  for (const unit in units) {
    if (!units[unit]) continue;
    output += `<span style="margin-right: 15px">
    ${getUnitName(unit)}: ${units[unit]}
    </span>`;
  }

  return output;
}

function drawVillage(villageName, villageData) {
  return `<tr class="nowrap">
            <td style="background-color: #fff5da; padding-left: 30px;">
                <a href="${villageData.url}" target="_blank">
                    ${villageName}
                </a>
            </td>
        </tr>
        <tr class="nowrap">
            <td colspan="2" style="background-color: #fff5da; padding-left: 60px; font-style: italic; font-size: 96%; padding-bottom: 6px">
                ${drawUnits(villageData.units)}
                <span style="margin-left: 10px; font-weight: bold;">
                    (${villageData.pop} pop)
                </span>
            </td>
        </tr>`;
}

//////////////////////////////////////////////////////////////////////////
function saveHCPopPref() {
  const checkbox = document.getElementById("toggle_hc_pop");
  if (checkbox.checked == true) {
    window.localStorage.setItem("asc_hc_pop", "4");
  } else {
    window.localStorage.setItem("asc_hc_pop", "6");
  }
}

function drawHCPopCheckbox() {
  const checked = hcPop === "6" ? "" : " checked";
  return `<div style="text-align: right; font-style: italic; font-size:85%; padding-right: 15px;">
            <input 
                type="checkbox" 
                id="toggle_hc_pop" 
                value="1"${checked}
                onClick="saveHCPopPref()"
            >
            <label for="toggle_hc_pop">Count HC as 4 pop (uncheck and reload to count as 6):</label>
        </div>`;
}

function onToggleWidget(id, img) {
  const imgSrc = $(img).attr("src");
  if (imgSrc === "graphic/minus.png") {
    $(`#${id} > div.widget_content`).hide();
    $(img).attr("src", "graphic/plus.png");
  } else {
    $(`#${id} > div.widget_content`).show();
    $(img).attr("src", "graphic/minus.png");
  }
}

function drawExpandableWidget(id, heading, content, expanded = false) {
  let imagePath = expanded ? "graphic/minus.png" : "graphic/plus.png";
  let widgetContentStyle = expanded ? "display: block" : "display: none";

  let output = `<div id="${id}" class="vis moveable widget " style="margin: 5px;">
    <h4 class="head with-button ui-sortable-handle" style="padding: 4px 3px 4px 15px;">
        <img style="float:right" class="widget-button" onclick="return onToggleWidget( '${id}', this );"
            src="${imagePath}"> ${heading}
    </h4>
            <div class="widget_content" style="${widgetContentStyle}">${content}</div>
        </div>
    `;

  return output;