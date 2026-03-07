const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); // NAYA: Password Lock karne ka tool

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

// Schemas
const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    password: String // Ab yahan khufiya code save hoga
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
// SECURE REGISTER: Password ko lock karna
// ==========================================
app.post('/register', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const existingUser = await User.findOne({ phone: phone });
        if(existingUser) {
            return res.json({ success: false, message: "Yeh number pehle se register hai!" });
        }
        
        // NAYA: Password ko khufiya code (Hash) mein badalna
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Database me khufiya password save karna
        const newUser = new User({ name, phone, password: hashedPassword });
        await newUser.save();
        
        res.json({ success: true, message: "Secure Account successfully ban gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Error: " + error.message });
    }
});

// ==========================================
// SECURE LOGIN: Khufiya code ko match karna
// ==========================================
app.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        // Admin Login (Ise bhi future me secure karenge)
        if (phone === "7739818651" && password === "Admin@123") {
            return res.json({ success: true, message: "Welcome Boss!", userName: "Admin (Raj Telecome)", userPhone: "7739818651", isAdmin: true });
        }

        // Customer Login
        const user = await User.findOne({ phone: phone });
        if(!user) {
            return res.json({ success: false, message: "Mobile number register nahi hai!" });
        }

        // NAYA: Type kiye gaye password ko database ke khufiya code se check karna
        const isMatch = await bcrypt.compare(password, user.password);
        
        if(isMatch) {
            res.json({ success: true, message: "Secure Login Successful!", userName: user.name, userPhone: user.phone, isAdmin: false });
        } else {
            res.json({ success: false, message: "Password galat hai!" });
        }
    } catch (error) {
        res.json({ success: false, message: "Error: " + error.message });
    }
});

// SECURE RESET PASSWORD
app.post('/reset-password', async (req, res) => {
    try {
        const { phone, name, newPassword } = req.body;
        const user = await User.findOne({ phone: phone, name: name });

        if(user) {
            // Naye password ko bhi lock karke save karna
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            user.password = hashedPassword;
            await user.save();
            res.json({ success: true, message: "Aapka naya password secure tarike se set ho gaya hai!" });
        } else {
            res.json({ success: false, message: "Galat jankari! Mobile number ya Naam account se match nahi ho raha hai." });
        }
    } catch (error) {
        res.json({ success: false, message: "Error: " + error.message });
    }
});

// Admin & Product Routes (Pehle jaise hi)
app.get('/get-users', async (req, res) => {
    try {
        const users = await User.find({}, { name: 1, phone: 1, _id: 0 });
        res.json({ success: true, users: users });
    } catch (error) {
        res.json({ success: false, message: "Data nikalne mein error aaya." });
    }
});

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

app.get('/get-products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products: products });
    } catch (error) {
        res.json({ success: false, message: "Products load nahi hue." });
    }
});

app.post('/delete-product', async (req, res) => {
    try {
        const { id } = req.body;
        await Product.findByIdAndDelete(id);
        res.json({ success: true, message: "Product successfully delete ho gaya!" });
    } catch (error) {
        res.json({ success: false, message: "Delete karne mein error aaya." });
    }
});

app.post('/razorpay-webhook', (req, res) => {
    res.status(200).send('ok');
});

app.get('/', (req, res) => {
    res.send("🚀 Raj Telecome Secure Backend Server is Running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
