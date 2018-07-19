/**
 * Endpoints/Services related to User object in specified retailer DB
 */

//Node modules
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

//Helper Function
var helper = require('../helper');

//Required Models
var User = require('../models/User');
var UserNotificationSetting = require('../models/UserNotificationSetting');

//Config stuff
var config_file_name = '../configs/' + helper.ENVIRONMENT + '.json';
var user_secret_key = require(config_file_name).UserSecret;
var jwt_secret_key = require(config_file_name).JwtSecret;

//Control Service - Mainly for some login/signup stuff
var service_control = require('./ControlService');

exports.userSignup = function(req, res){

    //Check if url_part is present
    var url_part = req.params.url_part
    if(url_part){

        //Fetch Retailer DB from Retailer URL
        service_control.getRetailerDBFromURL(url_part).then(Retailer_DB =>{

            //We now have a proper retailer database.. proceed with user signup

            //Define models based on DB
            var user = new User(Retailer_DB).dbSeq;

            //Extract body params
            var Email = req.body.Email;
            var Password = req.body.Password;
            var First_Name = req.body.First_Name;
            var Last_Name = req.body.Last_Name;
            var UserType_id = 1;

            //Check if all the params were sent
            if(Email && Password && First_Name && Last_Name){

                //Check if email is already used
                user.findOne({
                    where:{
                        Email: Email
                    }
                }).then(email_existing_user=>{
                    if(!email_existing_user){
                        //No users were found with that email..proceed with user creation
                        //Hash the password to be stored in DB
                        var hashed_password = crypto.createHmac('sha256', user_secret_key)
                                            .update(Password)
                                            .digest('hex');

                        //Create the user in DB
                        user.create({
                            Email: Email,
                            UserType_id: UserType_id,
                            Password: hashed_password,
                            First_Name: First_Name,
                            Last_Name: Last_Name,
                            Mobile_Number: "",
                            FCM_token: ""
                        }).then(user_created=>{

                            //Since user_created is a sequelize model, take out raw data from it
                            var user_obj = user_created.dataValues;

                            //Create payload for JWT
                            delete user_obj.Password;
                            delete user_obj.FCM_token;
                            var token = constructJwt({
                                user: user_obj,
                                Retailer_DB: Retailer_DB
                            });

                            //Send the token as response
                            helper.sendResponse(res, 200, true, {token: token});

                        }).catch(err=>{
                            console.error(err);
                            helper.sendResponse(res, 500, false, "Error signing up. Code 2.");
                        });

                    }else{
                        helper.sendResponse(res, 400, false, "Email already exists.");
                    }
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error signing up. Code 1.");
                });
            }else{
                helper.sendResponse(res, 400, false, "Insufficient Parameters");
            }

        }).catch(error => {
            //If error is null - meaning no retailer was found against the specified url part
            if(error === null){
                helper.sendResponse(res, 400, false, "Retailer not found");
            }else{
                helper.sendResponse(res, 500, false, "Error signing up. Code 0.");
            }
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters - URL PART");
    }
}

exports.login = function (req, res){

    //Check if url_part is present
    var url_part = req.params.url_part
    if(url_part){

        //Fetch Retailer DB from Retailer URL
        service_control.getRetailerDBFromURL(url_part).then(Retailer_DB =>{

            //We now have a proper retailer database.. proceed with user login

            //Define models based on DB
            var user = new User(Retailer_DB).dbSeq;

            //Extract body params
            var Email = req.body.Email;
            var Password = req.body.Password;

            //Check if necessary params were sent
            if(Email && Password){
                //Hash the password to query db
                var hashed_password = crypto.createHmac('sha256', user_secret_key)
                                            .update(Password)
                                            .digest('hex');

                //Find the user with those credentials
                user.findOne({
                    where:{
                        Email: Email,
                        Password: hashed_password
                    }
                }).then((user_found)=>{

                    //If email and password are incorrect, user would not be returned
                    if(user_found){
                        //Since user_found is a sequelize model, take out raw data from it
                        var user_obj = user_found.dataValues;

                        //Create payload for JWT
                        delete user_obj.Password;
                        delete user_obj.FCM_token;
                        var token = constructJwt({
                            user: user_obj,
                            Retailer_DB: Retailer_DB
                        });

                        //Send the token as response
                        helper.sendResponse(res, 200, true, {token: token});
                    }else{
                        helper.sendResponse(res, 401, false, 'Incorrect Email/Password');
                    }
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error fetching user. Code 1.");
                });
            }else{
                helper.sendResponse(res, 400, false, "Insufficient Parameters");
            }

        }).catch(error => {
            //If error is null - meaning no retailer was found against the specified url part
            if(error === null){
                helper.sendResponse(res, 400, false, "Retailer not found");
            }else{
                helper.sendResponse(res, 500, false, "Error signing up. Code 0.");
            }
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters - URL PART");
    }
}

exports.createUser = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user = new User(Retailer_DB).dbSeq;
    var user_notification_setting = new UserNotificationSetting(Retailer_DB).dbSeq;

    //Extract body params
    var Email = req.body.Email;
    var Password = req.body.Password;
    var First_Name = req.body.First_Name;
    var Last_Name = req.body.Last_Name;
    var UserType_id = req.body.UserType_id;
    var Mobile_Number = req.body.Mobile_Number;

    //Check if necessary params were sent
    if(Email && Password && First_Name && Last_Name && UserType_id && Mobile_Number != undefined){

        //Check if email is already used
        user.findOne({
            where:{
                Email: Email
            }
        }).then(email_existing_user=>{
            if(!email_existing_user){
                //No users were found with that email..proceed with user creation
                //Hash the password to be stored in DB
                var hashed_password = crypto.createHmac('sha256', user_secret_key)
                                    .update(Password)
                                    .digest('hex');

                //Create the user in DB
                user.create({
                    Email: Email,
                    UserType_id: UserType_id,
                    Password: hashed_password,
                    First_Name: First_Name,
                    Last_Name: Last_Name,
                    Mobile_Number: Mobile_Number,
                    FCM_token: ""
                }).then(user_created=>{
                    
                    //Return response if user is not admin.. since only admins need to have notification setting
                    if(UserType_id != 3){
                        return helper.sendResponse(res, 200, true, "User created successfully");
                    }

                    user_notification_setting.create({
                        User_id: user_created.id,
                        Desktop: true,
                        SMS: true,
                        Email: true
                    }).then(()=>{
                        helper.sendResponse(res, 200, true, "User created successfully");
                    }).catch(err=>{
                        console.error(err);
                        helper.sendResponse(res, 500, false, "User created successfully but an error was encountered while creating notification setting.");
                    });

                    
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error creating user. Code 2.");
                });

            }else{
                helper.sendResponse(res, 400, false, "Email already exists.");
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating user. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
};

exports.updatePassword = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user = new User(Retailer_DB).dbSeq;

    //Extract body params
    var id = req.body.id;
    var Old_Password = req.body.Old_Password;
    var New_Password = req.body.New_Password;

    //Check if all params were sent
    if(id && Old_Password && New_Password){

        //First find the user with the given id and old password
        var hashed_old_password = crypto.createHmac('sha256', user_secret_key)
                                        .update(Old_Password)
                                        .digest('hex');
        user.findOne({
            where:{
                id: id,
                Password: hashed_old_password
            }
        }).then(user_found => {
            if(user_found){

                //User details confirmed.. Update the user with new password
                var hashed_new_password = crypto.createHmac('sha256', user_secret_key)
                                        .update(New_Password)
                                        .digest('hex');
                user.update({
                    Password: hashed_new_password
                }, {
                    where:{
                        id: id
                    }
                }).then(()=>{
                    helper.sendResponse(res, 200, true, "Password updated successfully");
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error updating user. Code 1.");
                });

            }else{
                helper.sendResponse(res, 401, false, "Incorrect password!");
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error updating password. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.editUser = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user = new User(Retailer_DB).dbSeq;

    //Extract body params
    var id = req.body.id;
    var Email = req.body.Email;
    var Password = req.body.Password;
    var First_Name = req.body.First_Name;
    var Last_Name = req.body.Last_Name;
    var Mobile_Number = req.body.Mobile_Number;

    //Check if necessary params were sent
    if(id && Email && First_Name && Last_Name && Mobile_Number != undefined){
        var update_json;
        if(Password){
            //Hash the password to be stored in DB
            var hashed_password = crypto.createHmac('sha256', user_secret_key)
                                        .update(Password)
                                        .digest('hex');
            
            //Create the user object json with password field
            update_json = {
                Email: Email,
                Password: hashed_password,
                First_Name: First_Name,
                Last_Name: Last_Name,
                Mobile_Number: Mobile_Number
            }

        }else{
            //Create the user object json without the password field
            update_json = {
                Email: Email,
                First_Name: First_Name,
                Last_Name: Last_Name,
                Mobile_Number: Mobile_Number
            }
        }

        //Update the user in DB
        user.update(update_json, {
            where:{
                id: id
            }
        }).then(()=>{
            helper.sendResponse(res, 200, true, "User updated successfully");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error updating user. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getUser = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user = new User(Retailer_DB).dbSeq;

    //Extract route params
    var User_id = req.params.user_id;

    //Check if necessary params were sent
    if(User_id != undefined){

        //Get single user
        user.findOne({
            attributes:{
                exclude: ['Password', 'FCM_token']
            },
            where:{
                id: User_id
            }
        }).then((user_found)=>{
            helper.sendResponse(res, 200, true, user_found);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching User. Code 1.");
        });

    }else{

        //Get UserType query parameter
        var UserType_id = req.query.UserType_id;

        //If the user type id fetched from query is valid, then create a where clause. Else return all users.
        var where_clause;
        if(UserType_id == 1 || UserType_id == 2 || UserType_id == 3){
            where_clause = {
                UserType_id: UserType_id
            };
        }else{
            // Return all users
            where_clause = {};
        }

        //Get all users
        user.findAll({
            attributes:{
                exclude: ['Password', 'FCM_token']
            },
            where: where_clause
        }).then(users=>{
            helper.sendResponse(res, 200, true, users);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching Users. Code 1.");
        });

    }
}

exports.editNotificationSetting = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user_notification_setting = new UserNotificationSetting(Retailer_DB).dbSeq;

    //Extract body params
    var Desktop = req.body.Desktop;
    var SMS = req.body.SMS;
    var Email = req.body.Email;
    var User_id = req.body.User_id;

    //Check if necessary params were sent
    if(Desktop != undefined && SMS != undefined && Email != undefined && User_id){
        
        //Update the setting
        user_notification_setting.update({
            Desktop: Desktop,
            SMS: SMS,
            Email: Email
        },{
            where:{
                User_id: User_id
            }
        }).then(()=>{
            helper.sendResponse(res, 200, true, "Notification setting updated successfully.");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error updating notification setting. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getNotificationSetting = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user_notification_setting = new UserNotificationSetting(Retailer_DB).dbSeq;

    //Extract query params
    var User_id = req.query.User_id;

    //Check if necessary params were sent
    if(User_id){
        
        //Fetch notification setting
        user_notification_setting.findOne({
            where:{
                User_id: User_id
            }
        }).then((settings_found)=>{
            helper.sendResponse(res, 200, true, settings_found);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching notification setting. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.editFCMToken = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user = new User(Retailer_DB).dbSeq;

    //Extract body params
    var id = req.body.id;
    var FCM_token = req.body.FCM_token;

    //Check if necessary params were sent
    if(id && FCM_token != undefined){
        user.update({
            FCM_token: FCM_token
        },{
            where:{
                id: id
            }
        }).then(()=>{
            helper.sendResponse(res, 200, true, "FCM Token updated successfully.");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Updating FCM Token. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

//Utility Function to construct jwt with the given payload.
function constructJwt(payload){
    //Set expiry date of the token as 7 days
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    //Setting expiry date in the payload object
    payload['exp'] = parseInt(expiry.getTime() / 1000);

    //Generate token using jwt library
    return jwt.sign(payload, jwt_secret_key);
}