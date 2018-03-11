/**
 * This file will consist of utility methods/variables used by the app
 */

//Node libraries
var Sequelize = require('sequelize');

 //Used for server configs ('dev' or 'prod')
const ENVIRONMENT = 'dev';
module.exports.ENVIRONMENT = ENVIRONMENT;

/**
 * @author: Vidit Singhal
 * @param {*} isSuccessful - True/False
 * @param {*} message - String (Usually a message) / JSON object (data to be returned in response)
 * @description:
 * Returns a JSON object based on the parameter <message>
 * 
 * If <message> is a string, return body will look like - 
 *       {
 *           "success": true/false,
 *           "message": message
 *       }
 * If <message> is an object (data which needs to be returned), return body will look like - 
 *       {
 *           "success": true/false,
 *           "data": message
 *       }
 */
module.exports.getResponseObject = function(isSuccessful, message){
    if(typeof message == "string"){
        return {
            "success": isSuccessful,
            "message": message
        };
    }else{
        return {
            "success": isSuccessful,
            "data": message
        };
    }
};

/**
 * @author Vidit Singhal
 * @param {string} dbname - database name
 * @description - Returns sequelize object which is connected to the specified database
 */
module.exports.getAgencySeq = function(dbname){
    var config_file_name = './configs/' + ENVIRONMENT + '.json';
    var mysql_config = require(config_file_name).MySQL;

    return new Sequelize(dbname, mysql_config['username'], mysql_config['password'], {
        host: mysql_config['host'],
        dialect: 'mysql',
        pool:{
            max: 5,
            min: 0,
            idle: 10000
        },
        timezone: 'America/New_York'
    });
};