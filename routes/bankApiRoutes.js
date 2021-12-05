'use strict';

const auth = require("../middleware/auth")


module.exports = function(app) {
    const bankApi = require('../controllers/userController');

    app.route('/api/register')
        .post(bankApi.register_a_user);

    app.route('/api/users')
        .get(bankApi.get_all_users);

    app.route('api/user/id')
        .get(bankApi.find_user_byId);

    app.route('/api/login')
        .post(bankApi.login_a_user);

    app.route('/api/welcome')
        .post(bankApi.auth, auth);

    app.route('/api/deposit')
        .post(bankApi.deposit_funds);
};