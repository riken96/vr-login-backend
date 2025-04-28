const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

// ✅ Fix Firebase JSON parsing from ENV
const raw = process.env.FIREBASE_JSON;
const serviceAccount = JSON.parse(raw);
if (serviceAccount.private_key.includes("\\n")) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Store login status
let isLoggedIn = false;
let lastLoginTime = null;  

app.post("/createToken", async (req, res) => {
  const { idToken } = req.body;

  console.log("📥 Received ID token:", idToken?.substring(0, 30) + "...");

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("✅ Decoded token:", decodedToken);

    const uid = decodedToken.uid;
    const customToken = await admin.auth().createCustomToken(uid);
    console.log("🎟️ Firebase custom token created for UID:", uid);

     isLoggedIn = true;
    lastLoginTime = new Date();

    res.json({ token: customToken ,
             isLoggedIn: true});
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

app.get("/checkLoginStatus", (req, res) => {
  // Check if login is still valid (within last 24 hours)
  const now = new Date();
  const hoursSinceLastLogin = lastLoginTime ? (now - lastLoginTime) / (1000 * 60 * 60) : 24;
  
  if (hoursSinceLastLogin > 24) {
    isLoggedIn = false;
  }

  res.json({ 
    isLoggedIn: isLoggedIn,
    lastLoginTime: lastLoginTime
  });
});
app.post("/resetLoginStatus", (req, res) => {
  isLoggedIn = false;
  lastLoginTime = null;
  res.json({ success: true });
});

app.get("/", (req, res) => res.send("Auth Server Running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
