/**
 * Model for Message object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Message', {
        Conversation_id: Sequelize.INTEGER,
        Text: Sequelize.STRING,
        Is_From_Customer: Sequelize.BOOLEAN,
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: true,
        createdAt: 'Created_At',
        updatedAt: false
    });
};