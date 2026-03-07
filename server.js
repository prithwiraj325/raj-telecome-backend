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

// ==========================================
// 1. Database Schemas (User & Product)
// ==========================================
const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    password: String
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    whatsappMsg: String
});
const Product = mongoose.model('Product', productSchema);

// ==========================================
// 2. Authentication Routes
// ==========================================

// Register
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
        res.json({ success: false, message: "Asali Error: " + error.message });
    }
});

// Login (Admin & User)
app.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        // Admin Login
        if (phone === "7739818651" && password === "Admin@123") {
            return res.json({ success: true, message: "Welcome Boss!", userName: "Admin", isAdmin: true });
        }
        // Customer Login
        const user = await User.findOne({ phone: phone, password: password });
        if(user) {
            res.json({ success: true, message: "Login Successful!", userName: user.name, isAdmin: false });
        } else {
            res.json({ success: false, message: "Mobile number ya password galat hai!" });
        }
    } catch (error) {
        res.json({ success: false, message: "Asali Error: " + error.message });
    }
});

// Forgot Password / Reset Password
app.post('/reset-password', async (req, res) => {
    try {
        const { phone, name, newPassword } = req.body;
        // Security Check: Name aur Phone match hona chahiye
        const user = await User.findOne({ phone: phone, name: name });

        if(user) {
            // Agar details sahi hain, toh password badal do
            user.password = newPassword;
            await user.save();
            res.json({ success: true, message: "Aapka naya password successfully set ho gaya hai! Ab aap login kar sakte hain." });
        } else {
            res.json({ success: false, message: "Galat jankari! Mobile number ya Naam account se match nahi ho raha hai." });
        }
    } catch (error) {
        res.json({ success: false, message: "Server Error: " + error.message });
    }
});

// ==========================================
// 3. Admin & Product Routes
// ==========================================

// Get Users (For Admin Panel)
app.get('/get-users', async (req, res) => {
    try {
        const users = await User.find({}, { name: 1, phone: 1, _id: 0 });
        res.json({ success: true, users: users });
    } catch (error) {
        res.json({ success: false, message: "Data nikalne mein error aaya." });
    }
});

// Add New Product
app.post('/add-product', async (req, res) => {
    try {
        const { name, price, image, whatsappMsg } = req.body;
        const newProduct = new Product({ name, price, image, whatsappMsg });
        await newProduct.save();
        res.json({ success: true, message: "Product Website par Live ho gaya! 🎉" });
    } catch (error) {
        res.json({ success: false, message: "Error: " + error.message });
    }
});

// Get All Products (For Home Page & Manage Tab)
app.get('/get-products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products: products });
    } catch (error) {
        res.json({ success: false, message: "Products load nahi hue." });
    }
});

// Delete Product
app.post('/delete-product', async (req, res) => {
    try {
        const { id } = req.body;
        await Product.findByIdAndDelete(id);
        res.json({ success: true, message: "Product successfully delete ho gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Delete karne mein error aaya." });
    }
});

// ==========================================
// 4. Misc Routes & Server Start
// ==========================================
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
