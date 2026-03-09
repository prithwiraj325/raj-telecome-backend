const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); 
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ==========================================
// 1. Schemas (Database Tables)
// ==========================================
const userSchema = new mongoose.Schema({ name: String, phone: String, password: String, isVIP: { type: Boolean, default: false }, address: { type: String, default: "" } });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({ name: String, price: String, image: String, whatsappMsg: String });
const Product = mongoose.model('Product', productSchema);

const insuranceSchema = new mongoose.Schema({ name: String, phone: String, vehicleType: String, vehicleNumber: String, date: { type: Date, default: Date.now } });
const Insurance = mongoose.model('Insurance', insuranceSchema);

const orderSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, customerName: String, customerPhone: String, deliveryAddress: String, items: Array, totalAmount: Number, paymentMode: { type: String, default: 'Cash on Delivery / WhatsApp' }, orderStatus: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now } });
const Order = mongoose.model('Order', orderSchema);

const affiliateSchema = new mongoose.Schema({ title: String, url: String });
const Affiliate = mongoose.model('Affiliate', affiliateSchema);

// NAYA 1: CMS Settings Schema (Bina code edit kiye site badalne ke liye)
const settingsSchema = new mongoose.Schema({ phone: String, heroTitle: String, marqueeText: String, ytLink: String, fbLink: String });
const Settings = mongoose.model('Settings', settingsSchema);

// NAYA 2: Manual Sarkari Jobs Schema
const jobSchema = new mongoose.Schema({ title: String, category: String, lastDate: String, fee: String, shortDesc: String });
const Job = mongoose.model('Job', jobSchema);


// ==========================================
// 2. Authentication & Users
// ==========================================
app.post('/register', async (req, res) => { try { const { name, phone, password } = req.body; const existingUser = await User.findOne({ phone: phone }); if(existingUser) return res.json({ success: false, message: "Yeh number register hai!" }); const salt = await bcrypt.genSalt(10); const hashedPassword = await bcrypt.hash(password, salt); const newUser = new User({ name, phone, password: hashedPassword, isVIP: false }); await newUser.save(); res.json({ success: true, message: "Account ban gaya!" }); } catch (error) { res.json({ success: false }); } });
app.post('/login', async (req, res) => { try { const { phone, password } = req.body; if (phone === "7739818651" && password === "Admin@123") return res.json({ success: true, message: "Welcome Boss!", userId: "000", userName: "Admin", userPhone: "7739818651", isVIP: true, isAdmin: true, address: "" }); const user = await User.findOne({ phone: phone }); if(!user) return res.json({ success: false, message: "Number register nahi hai!" }); const isMatch = await bcrypt.compare(password, user.password); if(isMatch) res.json({ success: true, message: "Login Successful!", userId: user._id, userName: user.name, userPhone: user.phone, isVIP: user.isVIP, isAdmin: false, address: user.address }); else res.json({ success: false, message: "Password galat hai!" }); } catch (error) { res.json({ success: false }); } });
app.post('/reset-password', async (req, res) => { try { const { phone, name, newPassword } = req.body; const user = await User.findOne({ phone: phone, name: name }); if(user) { const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(newPassword, salt); await user.save(); res.json({ success: true, message: "Password set ho gaya!" }); } else { res.json({ success: false, message: "Galat jankari!" }); } } catch (error) { res.json({ success: false }); } });
app.post('/update-address', async (req, res) => { try { await User.findByIdAndUpdate(req.body.userId, { address: req.body.newAddress }); res.json({ success: true, message: "Address Save ho gaya!" }); } catch (error) { res.json({ success: false }); } });
app.get('/get-users', async (req, res) => { try { const users = await User.find({}, { name: 1, phone: 1, isVIP: 1, _id: 0 }); res.json({ success: true, users }); } catch (error) { res.json({ success: false }); } });

// ==========================================
// 3. Products, Orders & Links
// ==========================================
app.post('/add-product', async (req, res) => { try { const newProduct = new Product(req.body); await newProduct.save(); res.json({ success: true, message: "Live ho gaya!" }); } catch (error) { res.json({ success: false }); } });
app.get('/get-products', async (req, res) => { try { const products = await Product.find({}); res.json({ success: true, products }); } catch (error) { res.json({ success: false }); } });
app.post('/delete-product', async (req, res) => { try { await Product.findByIdAndDelete(req.body.id); res.json({ success: true, message: "Delete ho gaya!" }); } catch (error) { res.json({ success: false }); } });
app.post('/place-order', async (req, res) => { try { const newOrder = new Order({...req.body, paymentMode: 'Cash on Delivery / WhatsApp', orderStatus: 'Pending'}); await newOrder.save(); res.json({ success: true, message: "Order confirm ho gaya!" }); } catch (error) { res.json({ success: false }); } });
app.post('/my-orders', async (req, res) => { try { const orders = await Order.find({ userId: req.body.userId }).sort({ date: -1 }); res.json({ success: true, orders }); } catch (error) { res.json({ success: false }); } });
app.get('/all-orders-admin', async (req, res) => { try { const orders = await Order.find().sort({ date: -1 }); res.json({ success: true, orders }); } catch (error) { res.json({ success: false }); } });
app.post('/update-order-status', async (req, res) => { try { await Order.findByIdAndUpdate(req.body.orderId, { orderStatus: req.body.newStatus }); res.json({ success: true, message: "Status update ho gaya!" }); } catch (error) { res.json({ success: false }); } });
app.post('/add-affiliate', async (req, res) => { try { await new Affiliate(req.body).save(); res.json({success: true, message: "Link add ho gaya!"}); } catch (err) { res.json({success: false}); } });
app.get('/get-affiliates', async (req, res) => { try { const links = await Affiliate.find(); res.json({success: true, links}); } catch (err) { res.json({success: false}); } });
app.post('/delete-affiliate', async (req, res) => { try { await Affiliate.findByIdAndDelete(req.body.id); res.json({success: true, message: "Link delete ho gaya!"}); } catch (err) { res.json({success: false}); } });
app.post('/submit-insurance', async (req, res) => { try { await new Insurance(req.body).save(); res.json({ success: true, message: "Jankari mil gayi!" }); } catch (error) { res.json({ success: false }); } });
app.get('/get-insurance-leads', async (req, res) => { try { const leads = await Insurance.find().sort({ date: -1 }); res.json({ success: true, leads }); } catch (error) { res.json({ success: false }); } });

// ==========================================
// 4. NAYA: CMS Settings & Jobs API
// ==========================================
app.get('/get-settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if(!settings) { // Default settings agar DB khali ho
            settings = await new Settings({ phone: "7739818651", heroTitle: "Digital Services At Your Fingertips", marqueeText: "🌟 Join Our Family of 9,100+ Happy Customers!", ytLink: "https://www.youtube.com/c/TextSuport", fbLink: "https://facebook.com/textsuport" }).save();
        }
        res.json({ success: true, settings });
    } catch (err) { res.json({ success: false }); }
});

app.post('/update-settings', async (req, res) => {
    try {
        await Settings.findOneAndUpdate({}, req.body, { upsert: true });
        res.json({ success: true, message: "Website Update Ho Gayi!" });
    } catch (err) { res.json({ success: false }); }
});

app.post('/add-job', async (req, res) => {
    try { await new Job(req.body).save(); res.json({ success: true, message: "Job/Form Website par Live ho gaya!" }); } catch (err) { res.json({ success: false }); }
});

app.get('/get-jobs', async (req, res) => {
    try { const jobs = await Job.find().sort({_id: -1}); res.json({ success: true, jobs }); } catch (err) { res.json({ success: false }); }
});

app.post('/delete-job', async (req, res) => {
    try { await Job.findByIdAndDelete(req.body.id); res.json({ success: true, message: "Delete ho gaya" }); } catch (err) { res.json({ success: false }); }
});

app.get('/', (req, res) => { res.send("🚀 Raj Telecome Full Server Running!"); });
app.listen(process.env.PORT || 3000, () => { console.log(`Server Running!`); });
