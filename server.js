const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); 

const app = express();

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

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Database Connected!"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// ==========================================
// 1. Schemas (Database Tables)
// ==========================================
const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    password: String,
    isVIP: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    whatsappMsg: String
});
const Product = mongoose.model('Product', productSchema);

// NAYA: Insurance Enquiry ka Database
const insuranceSchema = new mongoose.Schema({
    name: String,
    phone: String,
    vehicleType: String,
    date: { type: Date, default: Date.now }
});
const Insurance = mongoose.model('Insurance', insuranceSchema);


// ==========================================
// 2. Authentication Routes
// ==========================================
app.post('/register', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const existingUser = await User.findOne({ phone: phone });
        if(existingUser) { return res.json({ success: false, message: "Yeh number pehle se register hai!" }); }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, phone, password: hashedPassword, isVIP: false });
        await newUser.save();
        res.json({ success: true, message: "Secure Account successfully ban gaya!" });
    } catch (error) { res.json({ success: false, message: "Error: " + error.message }); }
});

app.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (phone === "7739818651" && password === "Admin@123") {
            return res.json({ success: true, message: "Welcome Boss!", userName: "Admin (Raj Telecome)", userPhone: "7739818651", isVIP: true, isAdmin: true });
        }

        const user = await User.findOne({ phone: phone });
        if(!user) { return res.json({ success: false, message: "Mobile number register nahi hai!" }); }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch) {
            res.json({ success: true, message: "Secure Login Successful!", userName: user.name, userPhone: user.phone, isVIP: user.isVIP, isAdmin: false });
        } else { res.json({ success: false, message: "Password galat hai!" }); }
    } catch (error) { res.json({ success: false, message: "Error: " + error.message }); }
});

app.post('/reset-password', async (req, res) => {
    try {
        const { phone, name, newPassword } = req.body;
        const user = await User.findOne({ phone: phone, name: name });

        if(user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            user.password = hashedPassword;
            await user.save();
            res.json({ success: true, message: "Aapka naya password secure tarike se set ho gaya hai!" });
        } else { res.json({ success: false, message: "Galat jankari! Mobile number ya Naam account se match nahi ho raha hai." }); }
    } catch (error) { res.json({ success: false, message: "Error: " + error.message }); }
});


// ==========================================
// 3. Admin & Product Routes
// ==========================================
app.get('/get-users', async (req, res) => {
    try {
        const users = await User.find({}, { name: 1, phone: 1, isVIP: 1, _id: 0 });
        res.json({ success: true, users: users });
    } catch (error) { res.json({ success: false, message: "Data nikalne mein error aaya." }); }
});

app.post('/add-product', async (req, res) => {
    try {
        const { name, price, image, whatsappMsg } = req.body;
        const newProduct = new Product({ name, price, image, whatsappMsg });
        await newProduct.save();
        res.json({ success: true, message: "Product Website par Live ho gaya!" });
    } catch (error) { res.json({ success: false, message: "Error: " + error.message }); }
});

app.get('/get-products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products: products });
    } catch (error) { res.json({ success: false, message: "Products load nahi hue." }); }
});

app.post('/delete-product', async (req, res) => {
    try {
        const { id } = req.body;
        await Product.findByIdAndDelete(id);
        res.json({ success: true, message: "Product successfully delete ho gaya!" });
    } catch (error) { res.json({ success: false, message: "Delete karne mein error aaya." }); }
});


// ==========================================
// 4. NAYA: Insurance Enquiry Routes
// ==========================================
app.post('/submit-insurance', async (req, res) => {
    try {
        const { name, phone, vehicleType } = req.body;
        const newEnquiry = new Insurance({ name, phone, vehicleType });
        await newEnquiry.save();
        res.json({ success: true, message: "Aapki jankari hum tak pahunch gayi hai! Hum jald hi aapko best policy ke liye call karenge." });
    } catch (error) {
        res.json({ success: false, message: "Error: " + error.message });
    }
});

// Admin panel ke liye sari insurance leads mangwana
app.get('/get-insurance-leads', async (req, res) => {
    try {
        // Sabse nayi lead sabse upar aayegi
        const leads = await Insurance.find().sort({ date: -1 });
        res.json({ success: true, leads: leads });
    } catch (error) {
        res.json({ success: false, message: "Leads load nahi hui." });
    }
});


// ==========================================
// 5. RAZORPAY WEBHOOK
// ==========================================
app.post('/razorpay-webhook', async (req, res) => {
    try {
        const event = req.body.event;
        if (event === 'payment.captured' || event === 'payment.authorized') {
            const paymentEntity = req.body.payload.payment.entity;
            let customerPhone = paymentEntity.contact; 
            if (customerPhone) {
                customerPhone = customerPhone.replace("+91", "").trim();
                const user = await User.findOne({ phone: customerPhone });
                if (user) {
                    user.isVIP = true;
                    await user.save();
                }
            }
        }
        res.status(200).send('Webhook received');
    } catch (error) { res.status(500).send('Webhook Error'); }
});

app.get('/', (req, res) => {
    res.send("🚀 Raj Telecome Secure Backend Server is Running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
