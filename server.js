const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); 
const cors = require('cors');
const Razorpay = require('razorpay');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 🔴 YAHAN APNI RAZORPAY KEYS DALEIN 🔴
// ==========================================
const razorpay = new Razorpay({
  key_id: 'YOUR_RAZORPAY_KEY_ID',       // <-- ISE BADLEN
  key_secret: 'YOUR_RAZORPAY_KEY_SECRET' // <-- ISE BADLEN
});

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

// NAYA: Orders Database
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: String,
    customerPhone: String,
    items: Array, // Cart mein kya-kya hai (Name, Price, Image)
    totalAmount: Number,
    paymentStatus: { type: String, default: 'Pending' }, // Pending / Paid / Failed
    orderStatus: { type: String, default: 'Processing' }, // Processing / Shipped / Completed / Cancelled
    razorpayOrderId: String,
    razorpayPaymentId: String,
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
            // NAYA: Admin login mein uski dummy ID (000) bheji hai taaki order me error na aaye
            return res.json({ success: true, message: "Welcome Boss!", userId: "000000000000000000000000", userName: "Admin (Raj Telecome)", userPhone: "7739818651", isVIP: true, isAdmin: true });
        }

        const user = await User.findOne({ phone: phone });
        if(!user) { return res.json({ success: false, message: "Mobile number register nahi hai!" }); }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch) {
            // NAYA: userId bhi frontend ko bheja
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
// 3. Product & Admin Routes
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
// 4. NAYA: E-Commerce Orders & Payment System
// ==========================================

// Step 4.1: Razorpay se naya 'Order' generate karna
app.post('/create-order', async (req, res) => {
    try {
        const { userId, customerName, customerPhone, items, totalAmount } = req.body;

        // Razorpay ko hamesha paise (paise = Rupees * 100) me amount chahiye
        const options = {
            amount: totalAmount * 100, 
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Data ko 'Pending' status ke sath save kar lena
        const newOrder = new Order({
            userId, customerName, customerPhone, items, totalAmount,
            razorpayOrderId: razorpayOrder.id,
            paymentStatus: 'Pending',
            orderStatus: 'Processing'
        });
        await newOrder.save();

        res.json({ 
            success: true, 
            order_id: razorpayOrder.id, 
            amount: options.amount, 
            key_id: 'YOUR_RAZORPAY_KEY_ID', // Frontend ke liye
            db_order_id: newOrder._id 
        });

    } catch (error) {
        console.log("Create Order Error:", error);
        res.json({ success: false, message: "Payment link generate nahi ho paya." });
    }
});

// Step 4.2: Payment Success hone ke baad Database me 'Paid' likhna
app.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, db_order_id } = req.body;
        
        // Asli e-commerce mein yahan 'Signature Verification' bhi hota hai (security ke liye),
        // Par abhi MVP ke liye hum seedha 'Paid' mark kar rahe hain.
        
        await Order.findByIdAndUpdate(db_order_id, {
            paymentStatus: 'Paid',
            razorpayPaymentId: razorpay_payment_id
        });

        res.json({ success: true, message: "Payment Successful aur Order Confirm ho gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Payment update fail ho gaya." });
    }
});

// Step 4.3: User apni Order History dekhega
app.post('/my-orders', async (req, res) => {
    try {
        const { userId } = req.body;
        const orders = await Order.find({ userId: userId }).sort({ date: -1 });
        res.json({ success: true, orders: orders });
    } catch (error) {
        res.json({ success: false, message: "Orders load nahi hue." });
    }
});

// Step 4.4: Admin sare Orders dekhega aur Status Badlega
app.get('/all-orders-admin', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json({ success: true, orders: orders });
    } catch (error) {
        res.json({ success: false, message: "Admin orders error." });
    }
});

app.post('/update-order-status', async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;
        await Order.findByIdAndUpdate(orderId, { orderStatus: newStatus });
        res.json({ success: true, message: "Status update ho gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Status error." });
    }
});


app.get('/', (req, res) => {
    res.send("🚀 Raj Telecome Full E-Commerce Server is Running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
