/**
 * Model for Conversation object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Conversation', {
        Customer_Service_User_id: Sequelize.INTEGER,
        Customer_User_id: Sequelize.INTEGER,
        Is_Finished: Sequelize.BOOLEAN
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: true,
        createdAt: 'Created_At',
        updatedAt: false
    });
};