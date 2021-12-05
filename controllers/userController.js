'use strict';

const transaction = require('../models/transaction');

const mongoose = require("mongoose"),
    User = mongoose.model("user"),
    Transaction = mongoose.model("transaction"),
    jwt = require("jsonwebtoken"),
    auth = require("../middleware/auth"),
    bcrypt = require("bcrypt");

exports.get_all_users = function(req, res) {
    User.find({}, function(err, user) {
        if (err)
            res.send(err);
        res.json(user);
    })
}

exports.find_user_byId = function(req, res) {
    User.findById(req.params.Id, function(err, user) {
        if (err)
            res.send(err);
        res.json(user);
    });
};

exports.register_a_user = async function(req, res) {
    try {
        // Get user input
        const { fullName, email, password, accountBalance, accountType } = req.body;

        // Validate user input
        if (!(fullName && email && password && accountBalance)) {
            res.status(400).send("All input is required");
        }

        // check if user already exist
        // Validate if user exist in our database
        const oldUser = await User.findOne({ email });

        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }
        //Encrypt user password
        let encryptedPassword = await bcrypt.hash(password, 10);

        // Create user in our database
        const user = await User.create({
            fullName,
            accountBalance,
            accountType,
            email: email.toLowerCase(), // sanitize: convert email to lowercase
            password: encryptedPassword,
        });

        // Create token
        const token = jwt.sign({ user_id: user._id, email },
            process.env.TOKEN_KEY, {
                expiresIn: "2h",
            }
        );
        // save user token
        user.token = token;

        // return new user
        res.status(201).json(user);
    } catch (err) {
        return res.json({ message: err });
    }
}

exports.login_a_user = async function(req, res) {
    try {
        // Get user input
        const { email, password } = req.body;

        // Validate user input
        if (!(email && password)) {
            res.status(400).send("All input is required");
        }
        // Validate if user exist in our database
        const user = await User.findOne({ email });

        if (user === null || (await bcrypt.compare(password, user.password) == false)) {
            res.status(400).send("Invalid Credentials");
        }


        if (user && (await bcrypt.compare(password, user.password))) {
            // Create token
            const token = jwt.sign({ user_id: user._id, email },
                process.env.TOKEN_KEY, {
                    expiresIn: "2h",
                }
            );

            // save user token
            user.token = token;

            // user
            res.status(200).json(user);
        }

    } catch (err) {
        return res.json({ message: err });
    }
}

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NGN'
});

exports.deposit_funds = async function(req, res) {
    try {
        const { accountNumber, depositAmount, description, from } = req.body;
        if (!(accountNumber && depositAmount && description && from)) {
            res.status(400).send("All input are required");
        }
        let user = await User.findOne({ accountNumber });
        if (user === null) {
            res.status(404).send(`This User with account number ${accountNumber} does not exist`);
        }
        if (depositAmount < 5000) {
            res.status(400).send(`Sorry, deposit amount cannot be less than 5000`);
        }
        if (depositAmount >= 5000) {
            user.accountBalance = user.accountBalance + depositAmount;
            let transactionDetails = {
                transactionType: 'Deposit',
                accountNumber: accountNumber,
                description: description,
                sender: from,
                transactionAmount: depositAmount
            };
            await user.save();
            Transaction.create(transactionDetails)
            res.status(201).send(`Deposit of ${formatter.format(depositAmount)} to ${accountNumber} was successful.`)
        }

    } catch (err) {
        return res.json({ message: err });
    }
}

exports.auth = function(req, res, auth) {
    res.status(200).send("Welcome to This Bank Api built with NodeJs");
}