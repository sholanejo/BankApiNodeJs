'use strict';

const transaction = require('../models/transaction');

const mongoose = require("mongoose"),
    User = mongoose.model("user"),
    Transaction = mongoose.model("transaction"),
    session = mongoose.startSession,
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
exports.get_user_balance = function(req, res) {
    User.findById(req.params.Id, function(err, user) {
        if (err)
            res.status(404).send(`User with Id ${Id} does not exist in the database`);
        res.json(`The account balance of ${user.fullName} is ${user.accountBalance}`);
    });
};

exports.get_transaction_history = function(req, res) {
    Transaction.find({ accountNumber: req.params.accountNumber }, function(err, transaction) {
        if (err)
            res.status(404).send(`User with account number ${accountNumber} does not exist`);
        res.json(transaction);
    });
};

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

        if (user === null || (await bcrypt.compare(password, user.password) === false)) {
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

exports.change_password = async function(req, res) {
    try {
        const { email, password, newPassword, newPassConfirm } = req.body;
        if (!(email && password && newPassword && newPassConfirm)) {
            res.status(400).send("All input are required");
        }
        const user = await User.findOne({ email });
        if (user === null || (await bcrypt.compare(password, user.password) === false)) {
            res.status(400).send("Invalid Credentials");
        }
        if (newPassword !== newPassConfirm) {
            res.status(400).send("New password and Password confirmation must match");
        }
        if (user && (await bcrypt.compare(password, user.password)) && newPassword === newPassConfirm) {
            let encryptedPassword = await bcrypt.hash(newPassConfirm, 10);
            user.password = encryptedPassword;
            user.save();
            res.status(200).send("Password Changed Successfully");
        }
    } catch (e) {
        return res.json({ message: e });
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
            await Transaction.create(transactionDetails)
            res.status(201).send(`Deposit of ${formatter.format(depositAmount)} to ${accountNumber} was successful.`)
        }

    } catch (err) {
        return res.json({ message: err });
    }
}

exports.transfer_money = async function(req, res) {
    try {
        const { accountNumber, transferAmount, description } = req.body;
        if (!(accountNumber && transferAmount && description)) {
            res.status(400).send("All input are required");
        }

        let beneficiary = await User.findOne({ accountNumber });
        if (beneficiary === null) {
            res.status(400).send("User with this account number does not exist");
        }

        let currentUser = await User.findById(req.user.user_id);
        if (transferAmount > currentUser.accountBalance && transferAmount > 0) {
            res.status(400).send("Insufficient funds to make this transfer");
        }
        if (currentUser.accountNumber === beneficiary) {
            res.status(400).send("Sorry you cannot send money to yourself");
        }

        if (currentUser.accountNumber !== beneficiary) {
            beneficiary.accountBalance = beneficiary.accountBalance + transferAmount;
            currentUser.accountBalance = currentUser.accountBalance - transferAmount;
            let transactionDetails = {
                transactionType: 'Transfer',
                accountNumber: accountNumber,
                description: description,
                sender: currentUser.accountNumber,
                transactionAmount: transferAmount
            };
            await beneficiary.save();
            await currentUser.save();
            await Transaction.create(transactionDetails);

            res.status(200).send(`Transfer of ${formatter.format(transferAmount)} to ${accountNumber} was successful`);
        }
    } catch (err) {
        res.json({ message: err });
    }
}

exports.withdraw_money = async function(req, res) {
    try {
        const { withdrawAmount } = req.body;
        if (!withdrawAmount) {
            res.status(400).send("Please input the amount you'd like to withdraw");
        }
        let currentUser = await User.findById(req.user.user_id);
        if (withdrawAmount > currentUser.accountBalance) {
            res.status(400).send("Insufficient funds to make this withdrawal");
        }
        currentUser.accountBalance = currentUser.accountBalance - withdrawAmount;
        let transactionDetails = {
            transactionType: 'Withdraw',
            accountNumber: currentUser.accountNumber,
            description: `NIBSS withdrawal of ${formatter.format(withdrawAmount)}`,
            //sender: currentUser.accountNumber,
            transactionAmount: withdrawAmount
        };
        await currentUser.save();
        await Transaction.create(transactionDetails);
        res.status(200).send(`Withdrawal of ${formatter.format(withdrawAmount)} was successful`);
    } catch (e) {
        res.json({ message: e });
    }
}

//testing authorization
exports.auth = function(req, res) {
    res.status(200).send("Welcome to This Bank Api built with NodeJs");
}