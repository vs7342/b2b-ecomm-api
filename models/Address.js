/**
 * Model for Address object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Address', {
        User_id: Sequelize.INTEGER,
        Address_Line_1: Sequelize.STRING,
        Address_Line_2: Sequelize.STRING,
        City: Sequelize.STRING,
        State: Sequelize.STRING,
        Pincode: Sequelize.STRING
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};