/**
 * Model for ControlUser object (In control database)
 */

module.exports = function(){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq('control');

    this.dbSeq = agency_seq.define('ControlUser', {
        Username: Sequelize.STRING,
        Password: Sequelize.STRING,
        First_Name: Sequelize.STRING,
        Last_Name: Sequelize.STRING,
        Is_Active: Sequelize.BOOLEAN
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};