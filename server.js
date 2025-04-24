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

app.post("/createToken", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const customToken = await admin.auth().createCustomToken(uid);
    res.json({ token: customToken });
  } catch (err) {
    console.error("Token creation failed:", err);
    res.status(500).json({ error: "Token creation failed." });
  }
});

app.get("/", (req, res) => res.send("Auth Server Running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
