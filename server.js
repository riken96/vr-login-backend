const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const { initializeApp: initApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// ✅ Use service account from ENV
const raw = process.env.FIREBASE_JSON;
const serviceAccount = JSON.parse(raw);

// Fix private key newline issues
if (serviceAccount.private_key.includes("\\n")) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

// ✅ Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vrsimulator-f6cb4-default-rtdb.firebaseio.com" // ✅ IMPORTANT
});

const db = getDatabase();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Create token and store to DB
app.post("/createToken", async (req, res) => {
  const { idToken } = req.body;

  console.log("📥 Received ID token:", idToken?.substring(0, 30) + "...");

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("✅ Decoded token:", decodedToken);

    const uid = decodedToken.uid;
    const customToken = await admin.auth().createCustomToken(uid);
    console.log("🎟️ Firebase custom token created for UID:", uid);

    // ✅ Save token + status to Firebase Realtime Database
    await db.ref('/tokens/rikenToken').set({
      status: 'success',
      token: customToken
    });

    res.json({ token: customToken });
  } catch (err) {
    console.error("❌ Token creation failed:");
    console.error("🧨 Message:", err.message);
    console.error("📜 Full error:", err);

    res.status(500).json({
      error: "Token creation failed.",
      message: err.message
    });
  }
});

// (Optional) API to clear token manually
app.post("/clearToken", async (req, res) => {
  try {
    await db.ref('/tokens/rikenToken').set({
      status: 'waiting',
      token: ''
    });
    console.log("🧹 Token cleared");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to clear token:", err);
    res.status(500).json({ error: "Failed to clear token" });
  }
});

// ✅ Health Check API
app.get("/", (req, res) => res.send("✅ Auth Server Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
