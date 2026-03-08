const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); 
const cors = require('cors');

const app = express();

app.use(cors());
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

const insuranceSchema = new mongoose.Schema({
    name: String,
    phone: String,
    vehicleType: String,
    vehicleNumber: String,
    date: { type: Date, default: Date.now }
});
const Insurance = mongoose.model('Insurance', insuranceSchema);

// NAYA: E-Commerce Orders Database
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: String,
    customerPhone: String,
    items: Array, 
    totalAmount: Number,
    paymentMode: { type: String, default: 'Cash on Delivery / WhatsApp' }, 
    orderStatus: { type: String, default: 'Pending' }, // Pending / Processing / Completed / Cancelled
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

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
            // Admin dummy ID
            return res.json({ success: true, message: "Welcome Boss!", userId: "000000000000000000000000", userName: "Admin (Raj Telecome)", userPhone: "7739818651", isVIP: true, isAdmin: true });
        }

        const user = await User.findOne({ phone: phone });
        if(!user) { return res.json({ success: false, message: "Mobile number register nahi hai!" }); }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch) {
            res.json({ success: true, message: "Secure Login Successful!", userId: user._id, userName: user.name, userPhone: user.phone, isVIP: user.isVIP, isAdmin: false });
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
// 3. Product & Insurance Routes
// ==========================================
app.get('/get-users', async (req, res) => {
    try {
        const users = await User.find({}, { name: 1, phone: 1, isVIP: 1, _id: 0 });
        res.json({ success: true, users: users });
    } catch (error) { res.json({ success: false, message: "Data error." }); }
});

app.post('/add-product', async (req, res) => {
    try {
        const { name, price, image, whatsappMsg } = req.body;
        const newProduct = new Product({ name, price, image, whatsappMsg });
        await newProduct.save();
        res.json({ success: true, message: "Product Live ho gaya!" });
    } catch (error) { res.json({ success: false, message: "Error: " + error.message }); }
});

app.get('/get-products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products: products });
    } catch (error) { res.json({ success: false, message: "Products error." }); }
});

app.post('/delete-product', async (req, res) => {
    try {
        const { id } = req.body;
        await Product.findByIdAndDelete(id);
        res.json({ success: true, message: "Product delete ho gaya!" });
    } catch (error) { res.json({ success: false, message: "Delete error." }); }
});

app.post('/submit-insurance', async (req, res) => {
    try {
        const { name, phone, vehicleType, vehicleNumber } = req.body;
        const newEnquiry = new Insurance({ name, phone, vehicleType, vehicleNumber });
        await newEnquiry.save();
        res.json({ success: true, message: "Jankari mil gayi hai!" });
    } catch (error) { res.json({ success: false, message: "Error: " + error.message }); }
});

app.get('/get-insurance-leads', async (req, res) => {
    try {
        const leads = await Insurance.find().sort({ date: -1 });
        res.json({ success: true, leads: leads });
    } catch (error) { res.json({ success: false, message: "Leads error." }); }
});

// ==========================================
// 4. Order Tracking System (Direct Order)
// ==========================================

// Step 4.1: Customer naya order place karega
app.post('/place-order', async (req, res) => {
    try {
        const { userId, customerName, customerPhone, items, totalAmount } = req.body;

        const newOrder = new Order({
            userId, customerName, customerPhone, items, totalAmount,
            paymentMode: 'Cash on Delivery / WhatsApp',
            orderStatus: 'Pending'
        });
        await newOrder.save();

        res.json({ success: true, message: "Aapka Order successfully confirm ho gaya hai!" });
    } catch (error) {
        console.log("Order Error:", error);
        res.json({ success: false, message: "Order save nahi ho paya." });
    }
});

// Step 4.2: Customer apni profile mein orders dekhega
app.post('/my-orders', async (req, res) => {
    try {
        const { userId } = req.body;
        const orders = await Order.find({ userId: userId }).sort({ date: -1 });
        res.json({ success: true, orders: orders });
    } catch (error) {
        res.json({ success: false, message: "Orders load nahi hue." });
    }
});

// Step 4.3: Admin panel mein sabhi orders dikhenge
app.get('/all-orders-admin', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json({ success: true, orders: orders });
    } catch (error) {
        res.json({ success: false, message: "Admin orders error." });
    }
});

// Step 4.4: Admin kisi order ko Pending se Completed karega
app.post('/update-order-status', async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;
        await Order.findByIdAndUpdate(orderId, { orderStatus: newStatus });
        res.json({ success: true, message: "Order ka status update ho gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Status update error." });
    }
});

app.get('/', (req, res) => {
    res.send("🚀 Raj Telecome Full E-Commerce Server is Running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
