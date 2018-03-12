/**
 * Model for Alert object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Alert', {
        User_id: Sequelize.INTEGER,
        Product_id: Sequelize.INTEGER,
        Is_Triggered: Sequelize.BOOLEAN
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: true,
        createdAt: 'Created_At',
        updatedAt: 'Triggered_At'
    });
};