const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); 
const cors = require('cors');

// 🔥 FIREBASE ADMIN (For Automatic Push Notifications)
const admin = require("firebase-admin");
try {
    const serviceAccount = require("./firebase-key.json"); // Downloaded from Firebase
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin Connected!");
} catch(err) {
    console.log("⚠️ Firebase Key missing. Push notifications disabled.");
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 🗄️ MONGODB CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Master Database Connected!"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ==========================================
// 1. DATABASES (Schemas)
// ==========================================
const User = mongoose.model('User', new mongoose.Schema({ name: String, phone: String, password: String, isVIP: { type: Boolean, default: false }, address: String }));

// Seller (B2B Marketplace)
const Seller = mongoose.model('Seller', new mongoose.Schema({ shopName: String, ownerName: String, phone: String, password: String, walletBalance: { type: Number, default: 0 }, isApproved: { type: Boolean, default: true } }));

// Products (With Shop Name & Commission)
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: String, image: String, sellerId: { type: String, default: 'admin' }, shopName: { type: String, default: 'Raj Telecome' }, commissionRate: { type: Number, default: 10 }, createdAt: { type: Date, default: Date.now } }));

const Order = mongoose.model('Order', new mongoose.Schema({ userId: String, customerName: String, customerPhone: String, deliveryAddress: String, items: Array, totalAmount: Number, paymentMode: String, orderStatus: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now } }));

const Job = mongoose.model('Job', new mongoose.Schema({ title: String, category: String, lastDate: String, fee: String, shortDesc: String }));

// ==========================================
// 2. AUTHENTICATION APIs (Login/Register)
// ==========================================
app.post('/register', async (req, res) => { 
    try { 
        const { name, phone, password } = req.body; 
        if(await User.findOne({ phone })) return res.json({ success: false, message: "Number already registered!" }); 
        const salt = await bcrypt.genSalt(10); const hashedPassword = await bcrypt.hash(password, salt); 
        await new User({ name, phone, password: hashedPassword }).save(); 
        res.json({ success: true, message: "Account Created!" }); 
    } catch (err) { res.json({ success: false, message: "Error" }); } 
});

app.post('/login', async (req, res) => { 
    try { 
        const { phone, password } = req.body; 
        if (phone === "7739818651" && password === "Admin@123") return res.json({ success: true, message: "Welcome Boss!", userId: "000", userName: "Admin", isVIP: true, isAdmin: true }); 
        const user = await User.findOne({ phone }); 
        if(!user) return res.json({ success: false, message: "Number not found!" }); 
        if(await bcrypt.compare(password, user.password)) res.json({ success: true, message: "Login Successful!", userId: user._id, userName: user.name, isVIP: user.isVIP, address: user.address }); 
        else res.json({ success: false, message: "Wrong Password!" }); 
    } catch (err) { res.json({ success: false }); } 
});

// ==========================================
// 3. SELLER APIs (B2B Partner Portal)
// ==========================================
app.post('/seller/register', async (req, res) => {
    try {
        const { shopName, ownerName, phone, password } = req.body;
        if(await Seller.findOne({ phone })) return res.json({ success: false, message: "Shop already registered!" });
        const salt = await bcrypt.genSalt(10);
        await new Seller({ shopName, ownerName, phone, password: await bcrypt.hash(password, salt) }).save();
        res.json({ success: true, message: "Seller Account Created!" });
    } catch (err) { res.json({ success: false, message: "Error" }); }
});

// ==========================================
// 4. SUPER APP FEATURES (Products, Jobs, Orders)
// ==========================================
app.post('/add-product', async (req, res) => { 
    try { 
        await new Product(req.body).save(); 
        res.json({ success: true, message: "Product Live!" }); 
    } catch (err) { res.json({ success: false }); } 
});

app.get('/get-products', async (req, res) => { 
    try { res.json({ success: true, products: await Product.find().sort({ createdAt: -1 }) }); } 
    catch (err) { res.json({ success: false }); } 
});

app.post('/place-order', async (req, res) => { 
    try { 
        await new Order(req.body).save(); 
        res.json({ success: true, message: "Order Placed!" }); 
    } catch (err) { res.json({ success: false }); } 
});

// 🔥 Add Govt Job & Trigger Automatic Firebase Notification
app.post('/add-job', async (req, res) => { 
    try { 
        await new Job(req.body).save(); 
        
        // AUTO NOTIFICATION TRIGGER
        if(admin.apps.length > 0) {
            const message = {
                notification: { title: "🚨 New Form Update!", body: `${req.body.title} - Apply now on Raj Telecome App.` },
                topic: "all_users"
            };
            admin.messaging().send(message).catch(err => console.log("Notif Error:", err));
        }

        res.json({ success: true, message: "Job Live & Notification Sent!" }); 
    } catch (err) { res.json({ success: false }); } 
});

app.get('/get-jobs', async (req, res) => { 
    try { res.json({ success: true, jobs: await Job.find().sort({_id: -1}) }); } 
    catch (err) { res.json({ success: false }); } 
});

// ==========================================
// 🌍 SERVER START
// ==========================================
app.get('/', (req, res) => { res.send("🚀 Raj Telecome Super-App Backend is LIVE!"); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Master Server is running on port ${PORT}`); });
