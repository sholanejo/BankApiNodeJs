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
exports.get_user_balance = function (req, res) {
    User.findById(req.params.Id, function(err, user) {
        if (err)
            res.status(404).send("User Does not exist in the database");
        res.json(`The account balance of ${user.fullName} is ${user.accountBalance}`);
    });
};

exports.get_transaction_history = function(req, res) {
    User.findOne();
}

exports.find_user_byId = function(req, res) {
    User.findById(req.params.Id, function(err, user) {
        if (err)
            res.status(404).send("User Does not exist in the database");
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
        const oldUser = await User.findOne({ email });

        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }

        let encryptedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            fullName,
            accountBalance,
            accountType,
            email: email.toLowerCase(),
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
        const { email, password } = req.body;

        if (!(email && password)) {
            res.status(400).send("All input is required");
        }

        const user = await User.findOne({ email });

        if (user === null || (await bcrypt.compare(password, user.password) == false)) {
            res.status(400).send("Invalid Credentials");
        }


        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ user_id: user._id, email },
                process.env.TOKEN_KEY, {
                    expiresIn: "2h",
                }
            );

            user.token = token;
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

exports.transfer_money = function(req, res, auth) {
    try {
        const { beneficiaryAccount, transferAmount, description } = req.body;
        if (!(beneficiaryAccount && transferAmount && description)) {
            res.status(400).send("All input are required"); 
        }

    } catch {

    }
}

//testing authorization
exports.auth = function(req, res, auth) {
    res.status(200).send("Welcome to This Bank Api built with NodeJs");
}