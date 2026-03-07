const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// CORS Pass
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(bodyParser.json());

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Database Connected!"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    password: String
});
const User = mongoose.model('User', userSchema);

// Register Route (With Error Tracker)
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
        console.log("Registration Error:", error);
        // Ab screen par asali error dikhega
        res.json({ success: false, message: "Asali Error: " + error.message });
    }
});

// Login Route
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
        res.json({ success: false, message: "Asali Error: " + error.message });
    }
});

app.post('/razorpay-webhook', (req, res) => {
    res.status(200).send('ok');
});

app.get('/', (req, res) => {
    res.send("🚀 Raj Telecome Backend Server is Running Perfectly!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
