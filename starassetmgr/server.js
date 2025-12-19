import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

app.get("/", (req, res) => {
    res.send("StarAssetMgr is running!");
});

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
                "Cookie": ".ROBLOSECURITY=" + cookie
            }
        });

        const text = await response.text();
        res.setHeader("Content-Type", "application/json");
        res.send(text);

    } catch (err) {
        res.status(500).json({ error: "Proxy error", details: err.toString() });
    }
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Backend running on port " + PORT);
});
