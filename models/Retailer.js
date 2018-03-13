/**
 * Model for Retailer object (In control database)
 */

module.exports = function(){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq('control');

    this.dbSeq = agency_seq.define('Retailer', {
        Name: Sequelize.STRING,
        Time_Zone: Sequelize.STRING,
        Url_Part: Sequelize.STRING,
        Website_Title: Sequelize.STRING,
        Client_Template_id: Sequelize.INTEGER,
        Database_Name: Sequelize.STRING,
        Is_Processed: Sequelize.BOOLEAN
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};