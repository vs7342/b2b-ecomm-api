/**
 * Model for Cart object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Cart', {
        User_id: Sequelize.INTEGER,
        Product_id: Sequelize.INTEGER,
        Quantity: Sequelize.INTEGER
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};