import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());

// ✅ FIXED CORS (allows POST + OPTIONS preflight)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/", (req, res) => {
  res.send("StarAssetMgr is running!");
});

// ✅ Asset metadata lookup (uses cookie)
app.post("/asset", async (req, res) => {
  const { ids, cookie } = req.body;

  if (!ids || !cookie) {
    return res.status(400).json({ error: "Missing Roblox Asset ID or ROBLOSECURITY cookie." });
  }

  const url = "https://develop.roblox.com/v1/assets?assetIds=" + ids;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: ".ROBLOSECURITY=" + cookie
      }
    });

    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    res.send(text);

  } catch (err) {
    res.status(500).json({ error: "Proxy error", details: err.toString() });
  }
});

// ✅ User info
app.get("/user/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${id}`);
    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: "Roblox USER API error", details: err.toString() });
  }
});

// ✅ Group info
app.get("/group/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`https://groups.roblox.com/v1/groups/${id}`);
    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: "Roblox GROUPS API error", details: err.toString() });
  }
});

// ✅ Thumbnail proxy
app.get("/thumbnail/:id", async (req, res) => {
  const id = req.params.id;

  const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=420x420&format=Png&isCircular=false`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    res.setHeader("Content-Type", "application/json");
    res.send(text);

  } catch (err) {
    res.status(500).json({ error: "Roblox THUMBNAIL API error", details: err.toString() });
  }
});

// ✅ ✅ NEW: AssetDelivery endpoint (Animation / Audio downloads)
app.post("/delivery", async (req, res) => {
  const { assetId, cookie, placeId, creatorId, creatorType } = req.body;

  if (!assetId || !cookie) {
    return res.status(400).json({ error: "Missing assetId or ROBLOSECURITY cookie." });
  }

  let resolvedPlaceId = placeId || null;
  let resolvedGameId = null;

  try {
    // ✅ If user provided a placeId → resolve universe WITHOUT cookie
    if (resolvedPlaceId) {
      const uniRes = await fetch(
        `https://apis.roblox.com/universes/v1/places/${resolvedPlaceId}/universe`
      );

      if (!uniRes.ok) {
        const body = await uniRes.text();
        return res.status(400).json({
          error: "Failed to resolve universe from placeId.",
          status: uniRes.status,
          body
        });
      }

      const uniJson = await uniRes.json();
      resolvedGameId = uniJson.universeId?.toString() || null;
    }

    // ✅ If placeId missing → auto-detect WITHOUT cookie
    if (!resolvedPlaceId || !resolvedGameId) {
      if (creatorId && creatorType === "User") {
        const gamesRes = await fetch(
          `https://games.roblox.com/v2/users/${creatorId}/games?limit=50&sortOrder=Asc`
        );

        if (gamesRes.ok) {
          const gamesJson = await gamesRes.json();
          if (gamesJson.data && gamesJson.data[0]) {
            resolvedGameId = gamesJson.data[0].id.toString();
            resolvedPlaceId = gamesJson.data[0].rootPlace?.id?.toString() || resolvedPlaceId;
          }
        }
      }

      if (creatorId && creatorType === "Group") {
        const gamesRes = await fetch(
          `https://games.roblox.com/v2/groups/${creatorId}/games?limit=100&sortOrder=Asc`
        );

        if (gamesRes.ok) {
          const gamesJson = await gamesRes.json();
          if (gamesJson.data && gamesJson.data[0]) {
            resolvedGameId = gamesJson.data[0].id.toString();
            resolvedPlaceId = gamesJson.data[0].rootPlace?.id?.toString() || resolvedPlaceId;
          }
        }
      }
    }

    if (!resolvedPlaceId || !resolvedGameId) {
      return res.status(400).json({
        error: "Cound not find PlaceID or UniverseID/GameID. Try putting the Place ID in the box above.",
        details: { resolvedPlaceId, resolvedGameId }
      });
    }

    // ✅ AssetDelivery request — COOKIE USED HERE ONLY
    const adRes = await fetch(`https://assetdelivery.roblox.com/v1/assetId/${assetId}`, {
      headers: {
        "User-Agent": "Roblox/WinInet",
        Accept: "application/json",
        "Roblox-Place-Id": resolvedPlaceId,
        "Roblox-Game-Id": resolvedGameId,
        Cookie: `.ROBLOSECURITY=${cookie}`
      }
    });

    const bodyText = await adRes.text();

    if (!adRes.ok) {
      return res.status(adRes.status).json({
        error: "AssetDelivery request failed.",
        status: adRes.status,
        body: bodyText
      });
    }

    const json = JSON.parse(bodyText);

    if (!json.location) {
      return res.status(500).json({
        error: "Cound not find PlaceID or UniverseID/GameID. Try putting the Place ID in the box above."
      });
    }

    res.json({
      location: json.location,
      placeId: resolvedPlaceId,
      gameId: resolvedGameId
    });

  } catch (err) {
    res.status(500).json({ error: "Roblox ASSETDELIVERY API error", details: err.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
});
