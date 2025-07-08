let allGames = [];
let currentFilter = "ALL";
const PAGE_SIZE = 24;
let renderedCount = 0;
let filteredGames = [];
let currentSort = localStorage.getItem("sort") || "name-asc";
let minPrice = localStorage.getItem("minPrice") || "";
let maxPrice = localStorage.getItem("maxPrice") || "";

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = "★".repeat(fullStars);
  if (hasHalfStar) stars += "½";
  stars += "☆".repeat(5 - Math.ceil(rating));
  return stars;
}

function renderFilters() {
  const filtersDiv = document.getElementById("filters");
  filtersDiv.innerHTML = "";
  const platforms = ["ALL", "XboxOne", "XboxSeriesX", "PC"];

  // Platform filters
  platforms.forEach((platform) => {
    const btn = document.createElement("button");
    btn.textContent = platform;
    btn.className = `filter-button ${
      currentFilter === platform ? "active" : ""
    }`;
    btn.onclick = () => {
      currentFilter = platform;
      renderFilters();
      renderGames();
    };
    filtersDiv.appendChild(btn);
  });

  // Sorting controls
  const sortSelect = document.createElement("select");
  sortSelect.id = "sort-select";
  sortSelect.style.marginLeft = "1.5rem";
  [
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
    { value: "price-asc", label: "Price (Low → High)" },
    { value: "price-desc", label: "Price (High → Low)" },
    { value: "discount-desc", label: "Discount (High → Low)" },
    { value: "discount-asc", label: "Discount (Low → High)" },
    { value: "rating-desc", label: "Rating (High → Low)" },
    { value: "rating-asc", label: "Rating (Low → High)" },
  ].forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    if (currentSort === opt.value) option.selected = true;
    sortSelect.appendChild(option);
  });
  sortSelect.onchange = (e) => {
    currentSort = e.target.value;
    localStorage.setItem("sort", currentSort);
    renderGames();
  };
  filtersDiv.appendChild(sortSelect);

  // Price filter controls
  const priceDiv = document.createElement("span");
  priceDiv.style.marginLeft = "1.5rem";
  priceDiv.innerHTML = `
    <label style="margin-right:0.3rem;">Min Price:</label>
    <input id="min-price" type="number" min="0" style="width:70px;" value="${minPrice}" />
    <label style="margin:0 0.3rem 0 0.8rem;">Max Price:</label>
    <input id="max-price" type="number" min="0" style="width:70px;" value="${maxPrice}" />
    <button id="clear-price" class="filter-button" style="margin-left:0.3rem;">Clear</button>
  `;
  filtersDiv.appendChild(priceDiv);

  setTimeout(() => {
    // Scroll filters into view if needed
    const filtersEl = document.getElementById("filters");
    if (filtersEl && filtersEl.scrollWidth > filtersEl.clientWidth) {
      filtersEl.scrollLeft = 0;
    }

    // Auto-apply on input for min/max price
    const minInput = document.getElementById("min-price");
    const maxInput = document.getElementById("max-price");
    minInput.addEventListener("input", (e) => {
      minPrice = e.target.value;
      localStorage.setItem("minPrice", minPrice);
      renderGames();
    });
    maxInput.addEventListener("input", (e) => {
      maxPrice = e.target.value;
      localStorage.setItem("maxPrice", maxPrice);
      renderGames();
    });

    document.getElementById("clear-price").onclick = () => {
      minPrice = "";
      maxPrice = "";
      localStorage.removeItem("minPrice");
      localStorage.removeItem("maxPrice");
      minInput.value = "";
      maxInput.value = "";
      renderGames();
    };
  }, 0);

  // Animate filter controls
  Array.from(filtersDiv.children).forEach((el, idx) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
    el.style.animation = "filter-fade-in 0.4s forwards";
    el.style.animationDelay = `${0.05 + idx * 0.05}s`;
  });
}

async function animateCardRemoval() {
  const list = document.getElementById("games-list");
  const cards = Array.from(list.children);
  if (!cards.length) return;
  // Add fading-out class to all cards
  cards.forEach((card, idx) => {
    card.classList.add("fading-out");
    card.style.animationDelay = `${idx * 0.01}s`;
  });
  // Wait for animation to finish
  await new Promise((resolve) => setTimeout(resolve, 370));
  list.innerHTML = "";
}

function applyFilter() {
  filteredGames =
    currentFilter === "ALL"
      ? allGames
      : allGames.filter((game) => game.availableOn?.includes(currentFilter));

  // Price filtering
  filteredGames = filteredGames.filter((game) => {
    const priceObj = game.specificPrices?.purchaseable?.[0];
    if (!priceObj) return false;
    let price = priceObj.listPrice;
    if (typeof price !== "number") price = 0;
    if (minPrice && price < parseFloat(minPrice)) return false;
    if (maxPrice && price > parseFloat(maxPrice)) return false;
    return true;
  });

  // Sorting
  filteredGames.sort((a, b) => {
    const getPrice = (g) => g.specificPrices?.purchaseable?.[0]?.listPrice ?? 0;
    const getDiscount = (g) =>
      g.specificPrices?.purchaseable?.[0]?.discountPercentage ?? 0;
    const getRating = (g) => g.averageRating ?? 0;
    switch (currentSort) {
      case "name-asc":
        return (a.title || "").localeCompare(b.title || "");
      case "name-desc":
        return (b.title || "").localeCompare(a.title || "");
      case "price-asc":
        return getPrice(a) - getPrice(b);
      case "price-desc":
        return getPrice(b) - getPrice(a);
      case "discount-desc":
        return getDiscount(b) - getDiscount(a);
      case "discount-asc":
        return getDiscount(a) - getDiscount(b);
      case "rating-desc":
        return getRating(b) - getRating(a);
      case "rating-asc":
        return getRating(a) - getRating(b);
      default:
        return 0;
    }
  });

  renderedCount = 0;
}

async function renderGames() {
  // Animate out old cards before rendering new ones
  await animateCardRemoval();
  applyFilter();
  renderGamesBatch();
  // Attach scroll event for infinite scroll
  window.removeEventListener("scroll", handleScroll);
  window.addEventListener("scroll", handleScroll);
}

function renderGamesBatch() {
  const list = document.getElementById("games-list");
  const nextBatch = filteredGames.slice(
    renderedCount,
    renderedCount + PAGE_SIZE
  );

  nextBatch.forEach((game, idx) => {
    // Create the anchor that wraps the card
    const gameUrl = `https://www.xbox.com/tr-TR/games/store/_/${game.productId}`;
    const cardLink = document.createElement("a");
    cardLink.href = gameUrl;
    cardLink.target = "_blank";
    cardLink.rel = "noopener noreferrer";
    cardLink.className = "game-card-link";
    cardLink.tabIndex = 0;
    cardLink.style.textDecoration = "none";
    cardLink.style.display = "block";

    const card = document.createElement("div");
    card.className = "game-card";
    card.style.animationDelay = `${(renderedCount + idx) * 0.03}s`;

    // Image Section
    const imageContainer = document.createElement("div");
    imageContainer.className = "game-image-container";

    const img = document.createElement("img");
    img.className = "game-image lazy-blur";
    img.src =
      game.images?.superHeroArt?.url ||
      game.images?.boxArt?.url ||
      "placeholder.svg";
    img.alt = game.title;
    img.loading = "lazy"; // Native lazy loading

    // Blur-up effect: remove blur when loaded, add fade-in
    img.addEventListener("load", () => {
      img.classList.remove("lazy-blur");
      img.classList.add("loaded");
    });

    imageContainer.appendChild(img);

    // PEGI/Content Rating Badge (top left)
    if (game.contentRating && game.contentRating.rating) {
      const pegiBadge = document.createElement("div");
      pegiBadge.className = "pegi-badge";
      pegiBadge.title = game.contentRating.description || "";
      pegiBadge.textContent = game.contentRating.rating;
      imageContainer.appendChild(pegiBadge);
    }

    // Discount Badge (top right)
    if (game.specificPrices?.purchaseable?.[0]?.discountPercentage > 0) {
      const discountBadge = document.createElement("div");
      discountBadge.className = "discount-badge";
      discountBadge.textContent = `-%${Math.round(
        game.specificPrices.purchaseable[0].discountPercentage
      )}`;
      imageContainer.appendChild(discountBadge);
    }

    // Ranking Badge (bottom left)
    if (game.averageRating) {
      const rankingBadge = document.createElement("div");
      rankingBadge.className = "ranking-badge";
      rankingBadge.title = `User rating: ${game.averageRating.toFixed(1)} / 5`;
      rankingBadge.innerHTML = `<span class="star">★</span>${game.averageRating.toFixed(
        1
      )}`;
      imageContainer.appendChild(rankingBadge);
    }

    card.appendChild(imageContainer);

    // Content Section
    const content = document.createElement("div");
    content.className = "game-content";

    // Title
    const title = document.createElement("h2");
    title.className = "game-title";
    // Remove link from title, just plain text
    title.textContent = game.title;
    content.appendChild(title);

    // Meta Information
    const meta = document.createElement("div");
    meta.className = "game-meta";
    meta.innerHTML = `
              <span>${game.publisherName || "Unknown Publisher "}</span>
              <span>•</span>
              <span>${formatDate(game.releaseDate)}</span>
          `;
    content.appendChild(meta);

    // Categories
    if (game.categories?.length) {
      const categories = document.createElement("div");
      categories.className = "game-categories";
      game.categories.forEach((category) => {
        const tag = document.createElement("span");
        tag.className = "category-tag";
        tag.textContent = category;
        categories.appendChild(tag);
      });
      content.appendChild(categories);
    }

    // Description
    let descText = "";
    if (game.shortDescription) {
      descText = game.shortDescription;
    } else if (game.description) {
      // Smart truncate: 100-150 chars, end at sentence or word boundary
      let raw = game.description.trim();
      if (raw.length > 150) {
        // Try to find a period after 100 chars but before 150
        let periodIdx = raw.indexOf(".", 100);
        if (periodIdx !== -1 && periodIdx <= 150) {
          descText = raw.slice(0, periodIdx + 1);
        } else {
          // Otherwise, cut at last space before 150
          let lastSpace = raw.lastIndexOf(" ", 150);
          if (lastSpace > 100) {
            descText = raw.slice(0, lastSpace) + "...";
          } else {
            descText = raw.slice(0, 150) + "...";
          }
        }
      } else {
        descText = raw;
      }
    }
    if (descText) {
      const desc = document.createElement("p");
      desc.className = "game-description";
      desc.textContent = descText;
      content.appendChild(desc);
    }

    // Price Information
    if (game.specificPrices?.purchaseable?.[0]) {
      const price = game.specificPrices.purchaseable[0];
      const priceContainer = document.createElement("div");
      priceContainer.className = "price-container";

      if (price.discountPercentage > 0 && price.msrp > 0) {
        const originalPrice = document.createElement("span");
        originalPrice.className = "original-price";
        originalPrice.textContent = `${price.msrp} ${price.currency}`;
        priceContainer.appendChild(originalPrice);
      }

      const salePrice = document.createElement("span");
      salePrice.className = "sale-price";
      if (price.listPrice === 0) {
        salePrice.textContent = "Free";
      } else {
        salePrice.textContent = `${price.listPrice} ${price.currency}`;
      }
      priceContainer.appendChild(salePrice);

      content.appendChild(priceContainer);
    }

    // Rating (already shown as badge, so skip here)
    // Content Rating (already shown as badge, so skip here)

    card.appendChild(content);
    cardLink.appendChild(card);
    list.appendChild(cardLink);
  });

  renderedCount += nextBatch.length;
  document.getElementById(
    "games-count"
  ).textContent = `Listing ${filteredGames.length} games`;
  document.title = `Xbox Game Deals (${filteredGames.length})`;

  // If all games are loaded, remove the scroll event
  if (renderedCount >= filteredGames.length) {
    window.removeEventListener("scroll", handleScroll);
  }
}

function handleScroll() {
  // If near bottom, load more
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    // Prevent loading more if already all loaded
    if (renderedCount < filteredGames.length) {
      renderGamesBatch();
    }
  }
}

async function loadGames() {
  if (window.EMBEDDED_GAMES) {
    allGames = window.EMBEDDED_GAMES;
    renderFilters();
    renderGames();
    if (allGames.length === 0) {
      document.getElementById("games-list").innerHTML =
        '<div style="color: #ff6a6a; text-align: center; padding: 2rem;">No games found.</div>';
      document.getElementById("games-count").textContent = "";
    }
    return;
  }
  // fallback for dev: fetch JSON if EMBEDDED_GAMES not present
  try {
    const response = await fetch("all_games.json");
    const data = await response.json();
    allGames = data.games || [];
    renderFilters();
    renderGames();
    if (allGames.length === 0) {
      document.getElementById("games-list").innerHTML =
        '<div style="color: #ff6a6a; text-align: center; padding: 2rem;">No games found.</div>';
      document.getElementById("games-count").textContent = "";
    }
  } catch (e) {
    document.getElementById("games-list").innerHTML =
      '<div style="color: #ff6a6a; text-align: center; padding: 2rem;">Couldnt load games.</div>';
  }
}

loadGames();
