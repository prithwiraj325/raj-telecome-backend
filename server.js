const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// Cloudflare और Render को आपस में बात करने की परमिशन देना (CORS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json());

// MongoDB से कनेक्ट करना
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Database Connected!"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// ==========================================
// 1. ग्राहक का डेटाबेस फॉर्मेट (Schema) बनाना
// ==========================================
const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    password: String
});
const User = mongoose.model('User', userSchema);

// ==========================================
// 2. Register Route (नया अकाउंट बनाना और सेव करना)
// ==========================================
app.post('/register', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        
        // चेक करना कि क्या यह नंबर पहले से रजिस्टर है?
        const existingUser = await User.findOne({ phone: phone });
        if(existingUser) {
            return res.json({ success: false, message: "Yeh number pehle se register hai!" });
        }

        // नया ग्राहक डेटाबेस में सेव करना
        const newUser = new User({ name, phone, password });
        await newUser.save();
        
        res.json({ success: true, message: "Account successfully ban gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Kuch gadbad hui, dobara try karein." });
    }
});

// ==========================================
// 3. Login Route (अकाउंट में लॉगिन करना)
// ==========================================
app.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        // डेटाबेस में ग्राहक का नंबर और पासवर्ड मैच करना
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

// ==========================================
// 4. Razorpay Webhook (VIP पेमेंट के लिए)
// ==========================================
app.post('/razorpay-webhook', (req, res) => {
    console.log("Payment Received:", req.body);
    res.status(200).send('ok');
});

// सर्वर चालू करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
