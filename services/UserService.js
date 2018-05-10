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
                        helper.sendResponse(res, 200, false, "Email already exists.");
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

//Utility Function
function constructJwt(payload){
    //Set expiry date of the token as 7 days
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    //Setting expiry date in the payload object
    payload['exp'] = parseInt(expiry.getTime() / 1000);

    //Generate token using jwt library
    return jwt.sign(payload, jwt_secret_key);
}