'use strict';

module.exports = function(app) {
    const bankApi = require('../controllers/userController');

    app.route('/register')
        .post(bankApi.register_a_user);

    app.route('/users')
        .get(bankApi.get_all_users);

    app.route('/login')
        .post(bankApi.login_a_user);

    app.route('/welcome')
        .post(bankApi.auth);
};