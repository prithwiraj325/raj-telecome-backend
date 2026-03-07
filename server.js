const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// ==========================================
// सिक्योरिटी पास (CORS) - ब्राउज़र को परमिशन देना
// ==========================================
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    // अगर ब्राउज़र पहले सिक्योरिटी चेक (OPTIONS) करे, तो उसे पास दे दो
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(bodyParser.json());

// MongoDB से कनेक्ट करना
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Database Connected!"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// ग्राहक का डेटाबेस फॉर्मेट
const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    password: String
});
const User = mongoose.model('User', userSchema);

// Register Route (नया अकाउंट बनाना)
app.post('/register', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const existingUser = await User.findOne({ phone: phone });
        if(existingUser) {
            return res.json({ success: false, message: "Yeh number pehle se register hai!" });
        }
        const newUser = new User({ name, phone, password });
        await newUser.save();
        res.json({ success: true, message: "Account successfully ban gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Kuch gadbad hui, dobara try karein." });
    }
});

// Login Route (अकाउंट में लॉगिन करना)
app.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone: phone, password: password });
        if(user) {
            res.json({ success: true, message: "Login Successful!", userName: user.name });
        } else {
            res.json({ success: false, message: "Mobile number ya password galat hai!" });
        }
    } catch (error) {
        res.json({ success: false, message: "Server error." });
    }
});

// Razorpay Webhook
app.post('/razorpay-webhook', (req, res) => {
    console.log("Payment Received:", req.body);
    res.status(200).send('ok');
});

// होम पेज (नया वेलकम मैसेज)
app.get('/', (req, res) => {
    res.send("🚀 Raj Telecome Backend Server is Running Perfectly!");
});

// सर्वर चालू करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
