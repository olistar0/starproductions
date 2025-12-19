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
    res.send("StarAssets is running!");
});

app.post("/asset", async (req, res) => {
    const { ids, cookie } = req.body;

    if (!ids || !cookie) {
        return res.status(400).json({ error: "Missing roblox asset id or ROBOSECURITY cookie." });
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
        res.status(500).json({ error: "User lookup error", details: err.toString() });
    }
});

app.get("/group/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const response = await fetch(`https://groups.roblox.com/v1/groups/${id}`);
        const text = await response.text();
        res.setHeader("Content-Type": "application/json");
        res.send(text);
    } catch (err) {
        res.status(500).json({ error: "Group lookup error", details: err.toString() });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Backend running on port " + PORT);
});
