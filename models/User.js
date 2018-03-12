/**
 * Model for User object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('User', {
        Email: Sequelize.STRING,
        UserType_id: Sequelize.INTEGER,
        Password: Sequelize.STRING,
        First_Name: Sequelize.STRING,
        Last_Name: Sequelize.STRING,
        Mobile_Number: Sequelize.STRING,
        FCM_token: Sequelize.STRING
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};