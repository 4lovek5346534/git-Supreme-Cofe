import express from "express";
import dotenv from "dotenv";
import stripe from "stripe";

// Load variables
dotenv.config();

// Start Server
const app = express();

app.use(express.static("puplic"));
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
    res.sendFile("index.html", { root: "puplic" });
});
// Success
app.get("/", (req, res) => {
    res.sendFile("success.html", { root: "puplic" });
});
// Cancel
app.get("/", (req, res) => {
    res.sendFile("cancel.html", { root: "puplic" });
});
// Stripe 
let stripeGateway = stripe(process.env.stripe_api);
let DOMAIN = process.env.DOMAIN;

app.post("/stripe-checkout", async (req, res) => {
    const lineItems = req.body.items.map((item) => {
        const unitAmount = parseInt(item.price.replace(/[^0-9.-]+/g, "") * 100);
        console.log("item-price:", item.price);
        console.log("unitAmount:", unitAmount);
        return {
            price_data: {
                currency: "usd", 
                product-data: {
                    name: item.title,
                    images: [item.productImg]
                },
                unit_amount: unitAmount,
            },
            quantity: item.quantity,
        };
    });
    console.log("lineItems:", lineItems);

    // Create Checkout Session
    const session = await stripeGateway.checkout.sessions.create({
        payment_method_type: ["card"],
        mode: "payment",
        success_url: "${DOMAIN}/success", 
        cancel_url: "${DOMAIN}/cancel", 
        line_items: lineItems,
        // Asking Address In Stripe Checkout Page
        billing_address_collection: "required"
    });
    res.json(session.url);
});

app.listen(3000, () => {
    console.log("listening on port 3000;");
});