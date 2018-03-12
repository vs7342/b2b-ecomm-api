/**
 * Model for Message object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Message', {
        From_User_id: Sequelize.INTEGER,
        To_User_id: Sequelize.INTEGER,
        Text: Sequelize.STRING
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: true,
        createdAt: 'Created_At',
        updatedAt: false
    });
};