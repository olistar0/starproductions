app.post("/delivery", async (req, res) => {
  const { assetId, cookie, placeId, creatorId, creatorType } = req.body;

  if (!assetId || !cookie) {
    return res.status(400).json({ error: "Missing assetId or ROBLOSECURITY cookie." });
  }

  let resolvedPlaceId = placeId || null;
  let resolvedGameId = null;

  try {
    // If user provided a placeId, resolve universe WITHOUT cookie
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

    // If placeId was NOT provided, auto-detect WITHOUT cookie
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
        error: "Could not resolve Roblox-Place-Id or Roblox-Game-Id.",
        details: { resolvedPlaceId, resolvedGameId }
      });
    }

    // ✅ AssetDelivery request — USE COOKIE HERE
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
        error: "No 'location' field in AssetDelivery response.",
        body: json
      });
    }

    res.json({
      location: json.location,
      placeId: resolvedPlaceId,
      gameId: resolvedGameId
    });

  } catch (err) {
    res.status(500).json({ error: "AssetDelivery proxy error", details: err.toString() });
  }
});
