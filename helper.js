/**
 * This file will consist of utility methods/variables used by the app
 */

//Node libraries
var Sequelize = require('sequelize');

//Initialize ENVIRONMENT constant based on 'CURRENT_ENV' environment variable
//Possible values are 'dev' and 'prod'
var current_env = process.env.CURRENT_ENV;
var ENVIRONMENT;
if(current_env != undefined){
    ENVIRONMENT = current_env;
}else{
    ENVIRONMENT = 'dev';
}
module.exports.ENVIRONMENT = ENVIRONMENT;

/**
 * @author: Vidit Singhal
 * @param {*} httpResponse - HTTP Response object
 * @param {*} statusCode - HTTP Response code
 * @param {*} isSuccessful - True/False
 * @param {*} message - String (Usually a message) / JSON object (data to be returned in response)
 * @description:
 * Creates a response object (JSON) based on the parameter <message> and sends the response
 * 
 * If <message> is a string, response body will look like - 
 *       {
 *           "success": true/false,
 *           "message": message
 *       }
 * If <message> is an object (data which needs to be returned), response body will look like - 
 *       {
 *           "success": true/false,
 *           "data": message
 *       }
 */
module.exports.sendResponse = function(httpResponse, statusCode, isSuccessful, message){
    //Construct response object based on message parameter
    var responseObj;
    if(typeof message == "string"){
        responseObj = {
            "success": isSuccessful,
            "message": message
        };
    }else{
        responseObj = {
            "success": isSuccessful,
            "data": message
        };
    }

    //Send response
    httpResponse.status(statusCode).send(responseObj);
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