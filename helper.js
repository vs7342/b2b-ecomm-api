/**
 * This file will consist of utility methods/variables used by the app
 */

//Node libraries
var Sequelize = require('sequelize');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var firebase_admin = require('firebase-admin');

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

//Define config_file_name as per the environment
var config_file_name = './configs/' + ENVIRONMENT + '.json';

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

/**
 * @author Vidit Singhal
 * @param {string} token JWT Token which needs to be decoded
 * @description Verifies whether the token is valid or not. If valid, decoded value is returned. Else null is returned.
 */
module.exports.decodeToken = function(token) {
    //Fetch JWT Secret key from the config
    var jwt_secret_key = require(config_file_name).JwtSecret;

    //Call the verify method of jwt and return the decoded value. If it cannot be decoded, return null.
    return jwt.verify(token, jwt_secret_key, (error, decoded) => {
        if(error){
            return null;
        }else{
            return decoded;
        }
    });
}

/**
 * @author Vidit Singhal
 * @param {Array[string]} arr_receivers - Array of strings of recipients email IDs
 * @param {string} mail_subject - Email subject
 * @param {string} mail_body - Email body in html format
 * @description Sends Email to the specified list of recipients
 */
module.exports.sendEmail = function(arr_receivers, mail_subject, mail_body){
    
    //Configure the mail transporter
    var gmail_config = require(config_file_name).Gmail;
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth:{
            user: gmail_config['email'],
            pass: gmail_config['password']
        }
    });

    //Sender email ID will be same as configured email
    var sender_email_id = gmail_config['email'];

    //Parse receivers email ID
    var receivers = arr_receivers.join(', ');

    //Create mail options json
    var mail_options = {
        from: 'support.b2bcomm@gmail.com',
        to: receivers,
        subject: mail_subject,
        html: mail_body
    }

    //Finally send the email
    transporter.sendMail(mail_options, function(error, info){
        if(error)
            console.log("Error sending mail - " + error)
        else
            console.log("Email sent successfully. Info - " + JSON.stringify(info, null, 2));
    });

}

/**
 * @author Vidit Singhal
 * @param {string} receiver_contact - Receiver's Mobile number in E.164 format - [+][country code][phone number including area code]
 * @param {string} message_body - SMS Body
 * @description - Sends SMS to the specified recipient
 */
module.exports.sendSMS = function(receiver_contact, message_body){

    // Fetching twilio config
    var twilio_config = require(config_file_name).TWILIO;
    const account_sid = twilio_config['account_sid'];
    const auth_token = twilio_config['auth_token'];
    const from_twilio_number = twilio_config['from_twilio_number'];

    // Twilio library
    const twilio_client = require('twilio')(account_sid, auth_token);

    // Send SMS
    twilio_client.messages.create({
        body: message_body,
        from: from_twilio_number,
        to: receiver_contact
    }).then(message => {
        console.log("SMS sent successfully. Message Object - " + message + ". Message_SID - " + message.sid);
    }).catch(error => {
        console.log("Error sending SMS - " + error);
    })

}

/**
 * @author Vidit Singhal
 * @description - Initializes the firebase app. App is initialized only if it wasn't before.
 */
var initializeFCM = function(){

    //Initialize the firebase only if it not initialized before
    if(firebase_admin.apps.length === 0){

        //Fetch FCM related config
        var fcm_config = require(config_file_name).FCM;
        var service_account_path = fcm_config['config_file'];

        //Initializing FCM Service account
        var service_account = require('./configs/' + service_account_path);

        //Initialize the fcm app
        firebase_admin.initializeApp({
            credential: firebase_admin.credential.cert(service_account),
            databaseURL: fcm_config['database_url']
        })   
    }
}

/**
 * @author Vidit Singhal
 * @param {string} fcm_token FCM token of the recipient
 * @param {string} notification_title notification title
 * @param {string} notification_body notification body
 * @param {string} notification_data notification data
 * @description - Sends notification to the recipient with specified fcm token
 */
module.exports.sendNotification = function(fcm_token, notification_title, notification_body, notification_data){

    //Function takes care of not initializing the app more than once
    initializeFCM();

    //Define payload
    var payload = {
        notification: {
            title: notification_title,
            body: notification_body,
            data: notification_data
        },
        token: fcm_token
    };

    //Send push notification
    firebase_admin.messaging().send(payload).then(response =>{
        console.log("Notification sent successfully. Response - " + response);
    }).catch(error => {
        console.log("Error sending notification - " + error);
    })

    /*
    * Resources - To setup angular (client side) fcm
    * https://angularfirebase.com/lessons/send-push-notifications-in-angular-with-firebase-cloud-messaging/
    * https://github.com/angular/angularfire2/blob/master/docs/install-and-setup.md
    * https://firebase.google.com/docs/cloud-messaging/admin/send-messages#webpush_specific_fields
    */

}