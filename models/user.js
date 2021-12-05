const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: "Please enter the FullName" },
    email: { type: String, required: "Email address is required", match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'] },
    password: { type: String, required: "Password is required" },
    token: { type: String },
    accountNumber: { type: Number, default: Math.floor(Math.random() * 10000000) + 1111111 },
    accountBalance: { type: Number, required: "Please input the amount you would like to open an account with" },
    accountType: { type: String, enum: ['savings', 'current'], default: 'savings' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("user", userSchema);