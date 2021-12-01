const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    transactionType: { type: String, enum: ['deposit', 'withdraw', 'transfer'], required: "please input a valid transaction type" },
    accountNumber: { type: Number, required: "please ensure that the account number exists" },
    transactionAmount: { type: Number, required: "please enter a transaction amount" },
    transactionTime: { type: Date, default: Date.now },
});

module.exports = mongoose.model("transaction", transactionSchema);