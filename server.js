const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// 1. अपनी MongoDB का लिंक (URI) और Razorpay Secret यहाँ डालें
const MONGO_URI = 'mongodb+srv://prithwiraj325:<Prithvi@2002>@cluster.i6cxbvu.mongodb.net/?appName=Cluster';
const RAZORPAY_WEBHOOK_SECRET = 'your_razorpay_webhook_secret_here';

// 2. MongoDB से कनेक्ट करें
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Database Connected!'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// 3. डेटा का ढांचा (Schema) बनाएं कि क्या-क्या सेव करना है
const subscriberSchema = new mongoose.Schema({
    phone: String,           // ग्राहक का मोबाइल नंबर
    paymentId: String,       // Razorpay का पेमेंट ID
    amount: Number,          // कितने पैसे दिए
    status: { type: String, default: 'Active VIP' }, // स्टेटस
    joinedAt: { type: Date, default: Date.now }      // जुड़ने की तारीख और समय
});

// इस ढांचे से 'Subscriber' नाम का मॉडल बनाएं
const Subscriber = mongoose.model('Subscriber', subscriberSchema);

app.use(bodyParser.json());

// 4. Razorpay Webhook (पेमेंट रिसीव करने का रास्ता)
app.post('/razorpay-webhook', async (req, res) => {
    const razorpaySignature = req.headers['x-razorpay-signature'];

    const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

    // चेक करें कि रिक्वेस्ट असली है या नहीं
    if (generatedSignature === razorpaySignature) {
        const event = req.body.event;
        
        // अगर पेमेंट सक्सेसफुल हो गया है
        if (event === 'payment.captured') {
            const paymentData = req.body.payload.payment.entity;
            
            try {
                // 5. नया कस्टमर डेटाबेस में सेव करें
                const newSubscriber = new Subscriber({
                    phone: paymentData.contact,
                    paymentId: paymentData.id,
                    amount: paymentData.amount / 100, // पैसे को रुपये में बदला
                });

                await newSubscriber.save(); // डेटा MongoDB में सेव हो गया!
                console.log(`🎉 Naya VIP Member Save Ho Gaya! Phone: ${paymentData.contact}`);
                
                res.status(200).send('Webhook Received & Data Saved');
            } catch (error) {
                console.error('Data save karne mein error:', error);
                res.status(500).send('Database Error');
            }
        } else {
            res.status(200).send('Event ignored');
        }
    } else {
        console.error('❌ Invalid Razorpay Signature!');
        res.status(400).send('Invalid Signature');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Server running on port ${PORT}`);
});