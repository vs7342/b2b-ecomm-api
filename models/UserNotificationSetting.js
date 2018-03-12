/**
 * Model for UserNotificationSetting object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('UserNotificationSetting', {
        User_id: Sequelize.INTEGER,
        Desktop: Sequelize.BOOLEAN,
        SMS: Sequelize.BOOLEAN,
        Email: Sequelize.BOOLEAN
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};