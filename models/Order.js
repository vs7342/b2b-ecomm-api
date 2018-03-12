/**
 * Model for Order object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Order', {
        User_id: Sequelize.INTEGER,
        Shipping_Address_id: Sequelize.INTEGER,
        Billing_Address_id: Sequelize.INTEGER,
        StatusType_id: Sequelize.INTEGER,
        Tracking_id: Sequelize.STRING
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: true,
        createdAt: 'Created_At',
        updatedAt: 'Updated_At'
    });
};