/**
 * Model for StatusType object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('StatusType', {
        Type: Sequelize.STRING
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};