import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import dotenv from "dotenv";
import PromptSync from "prompt-sync";

console.log(`
==========================================================
  Xbox Game Deals Scraper (Unofficial)
  This script is NOT affiliated with Microsoft or Xbox.
  Use responsibly. Do not abuse or hammer the servers.
==========================================================
`);

const prompt = PromptSync({
  sigint: true,
});

// Load environment variables
dotenv.config({ quiet: true });

// Get language from env or user input
const getLanguage = () => {
  if (process.env.LANG_CODE) return process.env.LANG_CODE;
  ({ sigint: true });
  let lang = prompt("Enter language code (e.g. tr-TR, en-US): ");
  return lang || "tr-TR";
};

export const langCode = getLanguage();
export const langShort = langCode.split("-")[0];
if (!langCode || !/^[a-z]{2}-[A-Z]{2}$/.test(langCode)) {
  console.error(
    `Invalid language code: ${langCode}. Please use format like "tr-TR" or "en-US".`
  );
  process.exit(1);
}
console.log(`Using language code: ${langCode}`);

// Helper to base64 encode JSON for EncodedCT
function encodeCT(previousPageProductIds, maxTotalGames = 5000) {
  const obj = {
    HasMore: true,
    SkipCount: previousPageProductIds.length,
    TotalCount: maxTotalGames,
    PreviousPageProductIds: previousPageProductIds,
  };
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

// Fetch the first 25 game deals from the main page
async function fetchGameDeals() {
  const url = `https://www.xbox.com/${langCode}/games/browse/DynamicChannel.GameDeals`;
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      },
    });

    const $ = cheerio.load(html);
    let productsArr = null;

    $("script").each((_, el) => {
      const scriptContent = $(el).html();
      if (
        scriptContent &&
        scriptContent.includes("window.__PRELOADED_STATE__")
      ) {
        const match = scriptContent.match(
          /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});?\s*$/m
        );
        if (match && match[1]) {
          try {
            const state = eval("(" + match[1] + ")");
            if (
              state &&
              state.core2 &&
              state.core2.products &&
              state.core2.products.productSummaries
            ) {
              productsArr = Object.values(
                state.core2.products.productSummaries
              );
            }
          } catch (err) {
            console.error("Error parsing __PRELOADED_STATE__:", err.message);
          }
        }
      }
    });

    if (!productsArr) {
      console.log("Could not find products data.");
      return;
    }

    productsArr.slice(0, 25).forEach((game, idx) => {
      console.log(
        `${idx + 1}. ${
          game.Title || game.title || game.ProductTitle || "Unknown Title"
        }`
      );
    });

    return productsArr.slice(0, 25);
  } catch (error) {
    console.error("Error fetching game deals:", error.message);
    return [];
  }
}

// Helper: random delay between min and max ms
function randomDelay(min = 50, max = 200) {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
  );
}

// Helper: generate a random ms-cv string (16 chars + . + 2 digits)
function generateMsCv() {
  // 16 random base62 chars, then '.' then 2 random digits
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 16; ++i) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  s += "." + Math.floor(Math.random() * 90 + 10); // 2 digits
  return s;
}

// Fetch more game deals using the AJAX API
async function fetchMoreGameDeals(
  previousPageProductIds,
  maxTotalGames = 5000
) {
  const url = `https://emerald.xboxservices.com/xboxcomfd/browse?locale=${langCode}`;
  const headers = {
    accept: "*/*",
    "accept-language": `${langCode},${langShort};q=0.9`,
    "content-type": "application/json",
    dnt: "1",
    "ms-cv": generateMsCv(),
    origin: "https://www.xbox.com",
    referer: "https://www.xbox.com/",
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "x-ms-api-version": "1.1",
    "xbl-experiments":
      "enableuhfcache,forcerefreshexp,forceservernav,enableaamscript,enableserversideuserfeatureassignments,enableserverauthv3,aatest9010,aatestdevice9010,aa_test_device_50_50,autofullscreenpersist,disablexgp,enableaapaddfriendstream,enableaapmultiplayertitle,enableaapscreentimestream,enableabsolutemouse,enableaccountlinking,enableachievements,enableaskaparentaddfriend,enableaskaparentcontent,enableaskaparentscreentime,enableauthv2ew,enableauthv2ewtizen,enablebundlebuilderadobelaunch,enablebuynowdynamicmeparams,enablebuynowxboxuiexp,enablebyog,enablebyogpurchase,enablecartmoraystyling,enablechangegamertag,enablechatimageupload,enableclientauthv3,enableclientguide,enableclientguideinstream,enableclientrenderedcursor,enablecomingsoonupsell,enableconsoles,enablecontextualstorebrowse,enablecontrollerstatusv2,enabledefaultultimateupsell,enabledisconnectwarning,enableeditionupgradeoffer,enableenhancedreportareview,enablefriendlinksharing,enablefriendsandfollowers,enablegameinvites,enablegarrisoninlineredeem,enablegtaplus,enableguidechattab,enableguidehometab,enableguidenotifications,enableguideprofiletab,enableiapbrowseexperience,enablelaunchpad,enableleavingdate,enableloginsagafix,enablemaunaloa,enablemecontrolgamerscore,enablemecontrolpresence,enablemediaplayonweb,enablemessagesafetysettings,enablemiconmacsafari,enableminipdprefreshexp,enableminipdpsubsrefreshexp,enablemouseandkeyboard,enablemulticloudplaybutton,enablemultiupsellbutton,enablemutualfriendsprivacysettings,enablenetqualityindicator,enablenewsearchexperience,enablenewsearchgeneraltab,enableopenendedgameinvites,enableoverridedevsettings,enableparties,enablepdpgallery,enablepidlstandarizedforms,enableplaypathnavigation,enableplaywithfriendsrow,enablepresenceheartbeat,enableprivacycontrols,enableprovisioningupsell,enablereactcheckout,enablereactgiftflow,enablereactredeem,enablerealnamesharing,enableredeemcodemodal,enableremoteplay,enablesearchpagev2,enablesearchpromo,enablesenerchia,enablesessiontime,enablesisuucssupport,enablestorebyog,enablestreamstatistics,enabletakcontrolresizing,enabletakhighcontrastmode,enabletitanautorenewtoggle,enabletitanredeemsubs,enabletitleactivation,enabletvautosignout,enabletvlayerhint,enableubisoftpcversionlegaltext,enableubisoftplusdata,enableuniversalmediaplayer,enableusbguidance,enableuseretryafterheader,enableuserprofilepage,enableuserstoragemenu,enablewishlistgifting,enablexboxapponmobilegooglepay,enablexboxcomnewui,enablexboxcomredeemhostnor,enablexboxgamepadlite,enablexboxonerfaccountsettings,enablexboxonerfsetupredirectpage,enablexboxsmallpurchasedialog,enablexesurveys,enablexsearch,purchasesdkcartcheckout,randomizeentitlementquery,showmousekeyboardsetting,skipredirectcounter,test_flight_7_11_752,uselocalorigininvitelinks,usepostmessagehelper,usetizenh264mainsdphack,usev2msaxblauth,xwsrmdevaa50",
  };

  const body = {
    Filters: "e30=", // base64 for {}
    ReturnFilters: false,
    ChannelKeyToBeUsedInResponse:
      "BROWSE_CHANNELID=DYNAMICCHANNEL.GAMEDEALS_FILTERS=",
    EncodedCT: encodeCT(previousPageProductIds, maxTotalGames),
    ChannelId: "DynamicChannel.GameDeals",
  };

  try {
    const { data } = await axios.post(url, body, { headers });
    if (data && data.productSummaries) {
      const games = Object.values(data.productSummaries);
      games.forEach((game, idx) => {
        console.log(
          `${idx + 1}. ${
            game.Title || game.title || game.ProductTitle || "Unknown Title"
          }`
        );
      });
      return games;
    } else {
      console.log("No more games found.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching more game deals:", error.message);
    return [];
  }
}

// Helper: generate HTML with embedded game data
function generateHtmlWithGames(games, templatePath, outputPath) {
  const template = fs.readFileSync(templatePath, "utf-8");
  const gamesScript = `<script>window.EMBEDDED_GAMES = ${JSON.stringify(
    games,
    null,
    2
  )};</script>`;
  const result = template.replace(
    '<script src="main.js"></script>',
    `${gamesScript}\n<script src="main.js"></script>`
  );
  fs.writeFileSync(outputPath, result, "utf-8");
  console.log(`Generated HTML with embedded games at: ${outputPath}`);
}

// Fetch all game deals with pagination and save to file
async function fetchAllGameDeals() {
  let allGames = [];
  let hasMore = true;
  let page = 1;
  let previousIds = [];
  const maxTotalGames = 5000;

  const firstGames = await fetchGameDeals();
  if (!firstGames) return;
  allGames = [...firstGames];
  previousIds = allGames.map((g) => g.ProductId || g.productId);

  while (hasMore) {
    console.log(`\n[INFO] Waiting before next page request...`);
    await randomDelay(1200, 2500);
    console.log(`[INFO] Fetching page ${page + 1}...`);
    const moreGames = await fetchMoreGameDeals(previousIds, maxTotalGames);
    if (!moreGames.length) break;
    allGames = allGames.concat(moreGames);
    previousIds = allGames.map((g) => g.ProductId || g.productId);
    page++;
    if (moreGames.length < 25) hasMore = false;
    console.log(`[INFO] Total games fetched so far: ${allGames.length}`);
  }

  // Remove duplicates by ProductId
  const uniqueGamesMap = {};
  allGames.forEach((g) => {
    const id = g.ProductId || g.productId;
    if (id) {
      // Try to extract slug or url if available
      let slug = g.ProductSlug || g.Slug || g.UrlName || null;
      let url = g.ProductUrl || g.Url || g.url || null;
      // If not present, try to extract from AlternateIds or Links
      if (!slug && g.AlternateIds && g.AlternateIds.Slug)
        slug = g.AlternateIds.Slug;
      if (!url && g.Links && g.Links.Product) url = g.Links.Product;
      // Save these to the object for later use in HTML
      if (slug) g._slug = slug;
      if (url) g._url = url;
      uniqueGamesMap[id] = g;
    }
  });
  const uniqueGames = Object.values(uniqueGamesMap);

  const output = {
    games: uniqueGames,
    total: uniqueGames.length,
    scrapedAt: new Date().toISOString(),
  };
  // Write JSON as backup
  fs.writeFileSync(
    "public/all_games.json",
    JSON.stringify(output, null, 2),
    "utf-8"
  );
  // Generate HTML with embedded data
  generateHtmlWithGames(
    output.games,
    "public/templates/index.html",
    "public/index.generated.html"
  );
  console.log(
    `Saved ${uniqueGames.length} games to public/all_games.json and public/index.generated.html`
  );
  console.log(
    `You can now open public/index.generated.html in your browser to see the games list.`
  );
}

// Handle unhandled promise rejections and uncaught exceptions
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled promise rejection:", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err);
  process.exit(1);
});

// Handle Ctrl+C (SIGINT) gracefully
process.on("SIGINT", () => {
  console.log("\n[INFO] Scraper interrupted by user (Ctrl+C). Exiting...");
  process.exit(0);
});

// Run the full scraper
fetchAllGameDeals();
