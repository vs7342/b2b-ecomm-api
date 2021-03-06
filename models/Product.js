/**
 * Model for Product object
 */

module.exports = function(agency_dbname){
    var Sequelize = require('sequelize');
    var helper = require('../helper');
    var agency_seq = helper.getAgencySeq(agency_dbname);

    this.dbSeq = agency_seq.define('Product', {
        Name: Sequelize.STRING,
        Short_Description: Sequelize.STRING,
        Detail_Description: {
            type: Sequelize.BLOB,
            get() {
                var Detail_Description = this.getDataValue('Detail_Description');
                if(Detail_Description){
                    return Detail_Description.toString('utf8');
                }
            }
        },
        Price: Sequelize.DOUBLE,
        Image_Url: Sequelize.STRING,
        Quantity: Sequelize.INTEGER,
        Minimum_Quantity_Threshold: Sequelize.INTEGER
    }, {
        freezeTableName: true,
        logging: false,
        timestamps: false
    });
};