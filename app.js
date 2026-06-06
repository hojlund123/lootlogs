let allLoot = [];

const classColors = {
  warrior: "#C79C6E",
  paladin: "#F58CBA",
  hunter: "#ABD473",
  rogue: "#FFF569",
  priest: "#FFFFFF",
  deathknight: "#C41E3A",
  shaman: "#0070DD",
  mage: "#69CCF0",
  warlock: "#9482CA",
  druid: "#FF7D0A"
};

const classIcons = {
  warrior: "warrior",
  paladin: "paladin",
  hunter: "hunter",
  rogue: "rogue",
  priest: "priest",
  deathknight: "deathknight",
  shaman: "shaman",
  mage: "mage",
  warlock: "warlock",
  druid: "druid"
};

async function loadData() {
  const raidsResponse = await fetch("data/raids.json");
  const raidList = await raidsResponse.json();

  for (const file of raidList.raids) {
    const response = await fetch(`data/${file}`);
    const raid = await response.json();

    raid.forEach(item => {
      const winner = item.awardedTo
        .replace("-Spineshatter", "")
        .replace("|de|", "Disenchanted");

      allLoot.push({
        date: new Date(item.timestamp * 1000)
          .toISOString()
          .split("T")[0],

        player: winner,
        itemName: item.itemLink
          .replace(/[\[\]]/g, ""),

        itemID: item.itemID,
        offspec: item.OS,
        softReserve: item.SR,
        winnerClass: item.winnerClass,
        rolls: item.Rolls || [],
        awardedBy: item.awardedBy
          .replace("-Spineshatter", ""),
        timestamp: item.timestamp
      });
    });
  }

  // Sort by date descending
  allLoot.sort((a, b) => b.timestamp - a.timestamp);
  render(allLoot);
}

function getClassNameByID(classID) {
  const classMap = {
    1: "warrior",
    2: "paladin",
    3: "hunter",
    4: "rogue",
    5: "priest",
    6: "deathknight",
    7: "shaman",
    8: "mage",
    9: "warlock",
    11: "druid"
  };
  return classMap[classID] || "unknown";
}

function getClassColor(classID) {
  const className = getClassNameByID(classID);
  return classColors[className] || "#999";
}

function render(data) {
  const container = document.getElementById("lootContainer");

  container.innerHTML = data
    .map(
      row => `
        <div class="loot-card" data-item-id="${row.itemID}">
          <div class="card-header" style="border-left: 4px solid ${getClassColor(row.winnerClass)}">
            <div class="item-name"><a href="https://www.wowhead.com/item=${row.itemID}" target="_blank" class="wh-tooltip item-link" data-wowhead="item=${row.itemID}" data-type="item"><span>${row.itemName}</span></a></div>
            <div class="card-meta">
              <span class="date">${row.date}</span>
              ${row.softReserve ? '<span class="badge sr">Soft Reserved</span>' : ''}
              ${row.offspec ? '<span class="badge os">Off Spec</span>' : ''}
            </div>
          </div>
          <div class="card-body">
            <div class="winner-section">
              <div class="winner-class" style="background-color: ${getClassColor(row.winnerClass)}" title="${getClassNameByID(row.winnerClass)}">
                <img src="https://wow.zamimg.com/images/wow/icons/medium/classicon_${classIcons[getClassNameByID(row.winnerClass)]}.jpg" alt="${getClassNameByID(row.winnerClass)}" class="class-icon">
              </div>
              <div class="winner-info">
                <div class="winner-name">${row.player}</div>
              </div>
              ${row.rolls.length > 0 ? '<div class="expand-toggle">▼</div>' : ''}
            </div>
            ${row.rolls.length > 0 ? `
              <div class="rolls-section">
                <div class="rolls-title">Rolls (${row.rolls.length})</div>
                <div class="rolls-list">
                  ${row.rolls
                    .sort((a, b) => b.amount - a.amount)
                    .map(
                      roll => `
                        <div class="roll-item">
                          <span class="roll-player">${roll.player}</span>
                          <span class="roll-amount">${roll.amount}</span>
                          <span class="roll-spec ${roll.classification.toLowerCase()}">${roll.classification}</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </div>
            ` : ""}
          </div>
        </div>
      `
    )
    .join("");

  // Reinitialize WoWHead tooltips for new content
  if (typeof WowheadPower !== 'undefined') {
    WowheadPower.refreshLinks();
  }

  // Fetch and populate item icons
  updateItemIcons();
}

// Fetch item icons from WoWHead
async function updateItemIcons() {
  const itemLinks = document.querySelectorAll(".item-link[data-wowhead]");
  
  itemLinks.forEach(async (link) => {
    const itemId = link.getAttribute("data-wowhead").split("=")[1];
    
    // Try to fetch icon from WoWHead's API
    try {
      const response = await fetch(`https://www.wowhead.com/tooltip/item/${itemId}`);
      const html = await response.text();
      
      // Parse the icon URL from the HTML
      const iconMatch = html.match(/https:\/\/wow\.zamimg\.com\/images\/wow\/icons\/[^"]+/);
      if (iconMatch) {
        link.style.setProperty('--icon-url', `url('${iconMatch[0]}')`);
      }
    } catch (error) {
      // Silently fail - icon won't show
      console.debug('Could not load icon for item', itemId);
    }
  });
}

// Add event delegation for expand toggles
document.getElementById("lootContainer").addEventListener("click", (e) => {
  const toggle = e.target.closest(".expand-toggle");
  if (!toggle) return;

  const card = toggle.closest(".loot-card");
  
  // Remove expanded class from all cards
  document.querySelectorAll(".loot-card.expanded").forEach(expandedCard => {
    expandedCard.classList.remove("expanded");
  });
  
  // Add expanded class only to the clicked card
  card.classList.add("expanded");
});

function applyFilters() {
  const searchQuery = document.getElementById("search").value.toLowerCase();
  const classFilter = document.getElementById("classFilter").value.toLowerCase();
  const typeFilter = document.getElementById("typeFilter").value.toLowerCase();

  const filtered = allLoot.filter(row => {
    const matchesSearch =
      row.player.toLowerCase().includes(searchQuery) ||
      row.itemName.toLowerCase().includes(searchQuery);

    const matchesClass =
      !classFilter || getClassNameByID(row.winnerClass).toLowerCase() === classFilter;

    let matchesType = true;
    if (typeFilter === "ms") matchesType = !row.offspec && !row.softReserve;
    if (typeFilter === "os") matchesType = row.offspec;
    if (typeFilter === "sr") matchesType = row.softReserve;

    return matchesSearch && matchesClass && matchesType;
  });

  render(filtered);
}

document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("classFilter").addEventListener("change", applyFilters);
document.getElementById("typeFilter").addEventListener("change", applyFilters);

loadData();