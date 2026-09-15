import fs from "fs";
import path from "path";
import os from "os";

const BUCKET = "studio-6639048179-3b66d.firebasestorage.app";

async function run() {
  try {
    const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
    if (!fs.existsSync(configPath)) {
      throw new Error(`Firebase tools config not found at: ${configPath}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const tokens = config.tokens;
    if (!tokens || !tokens.refresh_token) {
      throw new Error("No tokens or refresh_token found in firebase-tools.json");
    }

    console.log("Refreshing access token using refresh_token...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
        client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token"
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token refresh failed: ${tokenResponse.status} - ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log("Access token successfully refreshed.");

    console.log(`Setting CORS configuration on bucket: ${BUCKET}...`);
    const corsRules = [
      {
        origin: ["*"],
        method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
        responseHeader: [
          "Content-Type",
          "Authorization",
          "Content-Length",
          "User-Agent",
          "x-goog-resumable",
          "Content-Disposition",
          "Accept-Ranges"
        ],
        maxAgeSeconds: 3600
      }
    ];

    const patchResponse = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cors: corsRules
      })
    });

    if (!patchResponse.ok) {
      const errText = await patchResponse.text();
      throw new Error(`Failed to update CORS: ${patchResponse.status} - ${errText}`);
    }

    console.log("✅ CORS configuration successfully applied!");
    console.log(JSON.stringify(await patchResponse.json(), null, 2));
  } catch (err) {
    console.error("❌ Error running script:", err.message);
    process.exit(1);
  }
}

run();
