/**
 * Endpoints/Services related to objects in Control DB (Retailer and ControlUser)
 */

//Node modules
var generator = require('generate-password');
var importer = require('node-mysql-importer');
var Sequelize = require('sequelize');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

//Helper functions
var helper = require("../helper");

//Required models
var ControlUser = require("../models/control/ControlUser");
var Retailer = require("../models/control/Retailer");

//Required models (Retailer DB)
var User = require('../models/User');
var UserNotificationSetting = require('../models/UserNotificationSetting');

//Create instances of these models
var ControlSeq = helper.getAgencySeq('control');
var control_user = new ControlUser().dbSeq;
var retailer = new Retailer().dbSeq;

//Config stuff
var config_file_name = '../configs/' + helper.ENVIRONMENT + '.json';
var mysql_config = require(config_file_name).MySQL;
var control_secret_key = require(config_file_name).ControlSecret;
var jwt_secret_key = require(config_file_name).JwtSecretControl;
var retailer_user_secret_key = require(config_file_name).UserSecret;

exports.createRetailer = function(req, res){
    
    //Extract request body params
    var Name = req.body.Name;
    var Time_Zone = req.body.Time_Zone;
    var Url_Part = req.body.Url_Part;
    var Website_Title = req.body.Website_Title;
    var Client_Template_id = req.body.Client_Template_id;
    var First_User_Email = req.body.First_User_Email;

    //Check if all params are provided
    if(Name && Time_Zone && Url_Part && Website_Title && Client_Template_id && First_User_Email){
        
        //Create Database Name
        var processed_db_name = 'Retailer_' + generator.generate({
            length: 20,
            numbers: false,
            symbols: false,
            uppercase: false
        }).toUpperCase();

        //Create an entry in Control DB - Retailer table
        retailer.create({
            Name: Name,
            Time_Zone: Time_Zone,
            Url_Part: Url_Part,
            Website_Title: Website_Title,
            Client_Template_id: Client_Template_id,
            Database_Name: processed_db_name,
            Is_Processed: false
        }).then(created_retailer=>{

            //Create retailer database using raw sequelize
            ControlSeq.query('CREATE SCHEMA IF NOT EXISTS `' + processed_db_name + '` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;', {
                type: Sequelize.QueryTypes.RAW
            }).then(()=>{
                //Retailer database was created successfully
                //Now create tables inside the database using the template file

                //Initialize sql importer with db connection params
                importer.config({
                    'host': mysql_config['host'],
                    'user': mysql_config['username'],
                    'password': mysql_config['password'],
                    'database': processed_db_name
                });

                //Import SQL
                //'SET..' statements and comments in template.sql file were throwing errors. Thus removed those.
                importer.importSQL('template.sql').then( () => {
                    
                    //As per the library, (then) should be executed after all the statements are executed in sql file
                    //But I dont think so it works and thus adding 10 seconds wait
                    setTimeout(()=>{

                        //Generate random password for first user
                        var first_user_password = generator.generate({
                            length: 10,
                            numbers: true,
                            symbols: true,
                            uppercase: true,
                            excludeSimilarCharacters: true
                        });

                        //Hash the pwd to store in DB
                        var hashed_password = crypto.createHmac('sha256', retailer_user_secret_key)
                                            .update(first_user_password)
                                            .digest('hex');
                        
                        //Define models for that database
                        var user = new User(processed_db_name).dbSeq;
                        var user_notification_setting = new UserNotificationSetting(processed_db_name).dbSeq;
                        
                        //1. Create the first retailer admin
                        user.create({
                            Email: First_User_Email,
                            UserType_id: 3,
                            Password: hashed_password,
                            First_Name: "Admin FName",
                            Last_Name: "Admin LName",
                            Mobile_Number: "",
                            FCM_token: ""
                        }).then(user_created => {

                            //2. Default notification settings
                            user_notification_setting.create({
                                User_id: user_created.id,
                                Desktop: true,
                                SMS: true,
                                Email: true
                            }).then(setting_created => {

                                //3. Update the retailer table - Is_Processed = true
                                retailer.update({
                                    Is_Processed: true
                                },{
                                    where: {
                                        id: created_retailer.id
                                    }
                                }).then(() => {

                                    //Finally send the response
                                    helper.sendResponse(res, 200, true, created_retailer);

                                    //4. (Async) Send an email to First Retailer Admin User with login credentials
                                    helper.sendEmail(
                                        [First_User_Email], 
                                        'Action Required: Reset your password!',
                                        `<p>
                                        Congratulations, <br/><br/>
                                        
                                        Your website is all set. Kindly login with the following info: <br/>
                                        Email: ` + First_User_Email + ` <br/>
                                        Password: ` + first_user_password + ` <br/><br/>

                                        It is recommended that you reset your password when you login. <br/><br/>

                                        Regards, <br/>
                                        B2BComm Team.
                                        </p>`
                                    );

                                }).catch(err=> {
                                    console.error(err);
                                    helper.sendResponse(res, 500, false, "Retailer DB Created. Error Creating First/Default values. Code 3.");
                                });

                            }).catch(err=> {
                                console.error(err);
                                helper.sendResponse(res, 500, false, "Retailer DB Created. Error Creating First/Default values. Code 2.");
                            });

                        }).catch(err=> {
                            console.error(err);
                            helper.sendResponse(res, 500, false, "Retailer DB Created. Error Creating First/Default values. Code 1.");
                        });

                    }, 10000)
                }).catch(err=> {
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error creating retailer. Code 3.");
                })

            }).catch(err=>{
                console.error(err);
                helper.sendResponse(res, 500, false, "Error creating retailer. Code 2.");
            });

        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating retailer. Code 1.")
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.editRetailer = function(req, res){

    //Extract request body params
    var id = req.body.id;
    var Name = req.body.Name;
    var Time_Zone = req.body.Time_Zone;
    var Url_Part = req.body.Url_Part;
    var Website_Title = req.body.Website_Title;
    var Client_Template_id = req.body.Client_Template_id;
    var Is_Processed = req.body.Is_Processed;

    //Check if all params are provided
    if(id && Name && Time_Zone && Url_Part && Website_Title && Client_Template_id && Is_Processed != undefined){

        //Update the entry in Control DB - Retailer table
        retailer.update({
            Name: Name,
            Time_Zone: Time_Zone,
            Url_Part: Url_Part,
            Website_Title: Website_Title,
            Client_Template_id: Client_Template_id,
            Is_Processed: Is_Processed
        },{
            where:{
                id: id
            }
        }).then(() => {
            helper.sendResponse(res, 200, true, "Retailer updated successfully.");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error updating retailer. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getRetailer = function(req, res){

    //Extract route params
    var Retailer_id = req.params.retailer_id;

    if(Retailer_id != undefined){
        //Fetch single retailer
        retailer.findOne({
            where:{
                id: Retailer_id
            }
        }).then(retailer_found=>{

            if(retailer_found){
                helper.sendResponse(res, 200, true, retailer_found);
            }else{
                helper.sendResponse(res, 404, false, "No retailer found");
            }
                
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching retailer. Code 1.");
        })
    }else{
        //Fetch all retailers
        retailer.findAll().then(all_retailers=>{
            helper.sendResponse(res, 200, true, all_retailers);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching retailers. Code 2.");
        })
    }
}

exports.deleteRetailer = function(req, res){

    //Extract body params
    var id = req.body.id;

    if(id){
        //Fetch retailer db name so that it can be dropped later
        retailer.findOne({
            where:{
                id: id
            }
        }).then(retailer_found=>{

            //Now drop the entry from control database - retailer table
            retailer.destroy({
                where:{
                    id: id
                }
            }).then(()=>{

                //Now drop the retailer database
                ControlSeq.query('DROP DATABASE ' + retailer_found.Database_Name + ';', {
                    type: Sequelize.QueryTypes.RAW
                }).then(()=>{
                    helper.sendResponse(res, 200, true, 'Retailer deleted and corresponding database dropped successfully.');
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Retailer deleted successfully. Error dropping database. Code 2.");
                });

            }).catch(err=>{
                console.error(err);
                helper.sendResponse(res, 500, false, "Error deleting retailer. Code 2.");
            })

        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error deleting retailer. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.createControlUser = function(req, res){

    //Extract body params
    var Username = req.body.Username;
    var Password = req.body.Password;
    var First_Name = req.body.First_Name;
    var Last_Name = req.body.Last_Name;

    //Check if all params are provided
    if(Username && Password && First_Name && Last_Name){

        //Create Hashed password to store in DB
        var hashed_password = crypto.createHmac('sha256', control_secret_key)
                                    .update(Password)
                                    .digest('hex');

        //Create user entry in db
        control_user.create({
            Username: Username,
            Password: hashed_password,
            First_Name: First_Name,
            Last_Name: Last_Name,
            Is_Active: true
        }).then(created_user=>{
            helper.sendResponse(res, 200, true, {user_id: created_user.id});
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating control user. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.editControlUser = function(req, res){

    //Extract body params
    var id = req.body.id;
    var Username = req.body.Username;
    var Password = req.body.Password;
    var First_Name = req.body.First_Name;
    var Last_Name = req.body.Last_Name;
    var Is_Active = req.body.Is_Active;

    //Check if all params are provided
    if(id && Username && Password && First_Name && Last_Name && Is_Active != undefined){

        //Create Hashed password to store in DB
        var hashed_password = crypto.createHmac('sha256', control_secret_key)
                                    .update(Password)
                                    .digest('hex');

        //Create user entry in db
        control_user.update({
            Username: Username,
            Password: hashed_password,
            First_Name: First_Name,
            Last_Name: Last_Name,
            Is_Active: Is_Active
        },{
            where: {
                id: id
            }
        }).then(()=>{
            helper.sendResponse(res, 200, true, "Control user updated successfully");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error updating control user. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getControlUser = function(req, res){

    //Extract route params
    var User_id = req.params.user_id;

    if(User_id != undefined){

        //Fetch single user
        control_user.findOne({
            attributes:{
                exclude: ['Password']
            },
            where:{
                id: User_id
            }
        }).then(user_found=>{

            if(user_found){
                helper.sendResponse(res, 200, true, user_found);
            }else{
                helper.sendResponse(res, 404, false, "No user found");
            }
                
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching user. Code 1.");
        })

    }else{

        //Fetch all users
        control_user.findAll({
            attributes:{
                exclude: ['Password']
            }
        }).then(all_users=>{
            helper.sendResponse(res, 200, true, all_users);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching users. Code 2.");
        })

    }
}

exports.deleteControlUser = function(req, res){

    //Extract body params
    var id = req.body.id;

    if(id){
        //Fetch control user to check if present
        control_user.findOne({
            where:{
                id: id
            }
        }).then(user_found=>{
            
            //Return if user not found
            if(user_found){

                //Delete the user
                control_user.destroy({
                    where:{
                        id: id
                    }
                }).then(()=>{
                    helper.sendResponse(res, 200, true, "User deleted successfully.");
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error deleting user. Code 1.");
                });

            }else{
                helper.sendResponse(res, 404, false, "User not found");
            }

        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error deleting user. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.loginControlUser = function(req, res){

    //Extract body params
    var Username = req.body.Username;
    var Password = req.body.Password;

    //Check if params are available
    if(Username && Password){
        
        //Hash the password using the secret
        var hashed_password = crypto.createHmac('sha256', control_secret_key)
                                    .update(Password)
                                    .digest('hex');

        //Query the database using hashed password
        control_user.findOne({
            attributes:{ exclude: ['Password'] },
            where:{
                Username: Username,
                Password: hashed_password
            }
        }).then(user_found=>{

            if(user_found){

                //Check if the user is active
                if(user_found.dataValues.Is_Active){
                    //Create JWT Token and return it to user

                    //JWT Payload will be having user details which are fetched from DB
                    var payload = user_found.dataValues;

                    //Set expiry date of the token as 7 days
                    var expiry = new Date();
                    expiry.setDate(expiry.getDate() + 7);

                    //Setting expiry date in the payload object
                    payload['exp'] = parseInt(expiry.getTime() / 1000);

                    //Generate token using jwt library
                    var token = jwt.sign(payload, jwt_secret_key);

                    //Send the token across
                    helper.sendResponse(res, 200, true, {token: token});

                }else{
                    helper.sendResponse(res, 404, false, "User Inactive");
                }

            }else{
                helper.sendResponse(res, 404, false, "Incorrect username/password");
            }
            
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Login Error. Code 1.");
        });
        
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.checkIfUrlAvailable = function(req, res){
    //Extract query params
    var Url_Part = req.query.Url_Part;

    //Check if params are available
    if(Url_Part){

        //Query the db with Url_Part
        retailer.findOne({
            attributes:['Database_Name'],
            where:{
                Url_Part: Url_Part
            }
        }).then(retailer_found => {
            if(retailer_found){
                //Send a response that url is not available
                helper.sendResponse(res, 200, true, {url_available: false});
            }else{
                //Send a response that url is available
                helper.sendResponse(res, 200, true, {url_available: true});
            }
        }).catch(err => {
            console.error(err);
            helper.sendResponse(res, 500, false, "Error while checking url availability. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getRetailerPublic = function(req, res){
    //Extract url param
    var Url_Part = req.params.url_part;

    if(Url_Part != undefined) {

        // Find the retailer with the given url_part (Should be processed)
        retailer.findOne({
            attributes:['Website_Title', 'Client_Template_id'],
            where:{
                Url_Part: Url_Part,
                Is_Processed: true
            }
        }).then(retailer_found =>{
            helper.sendResponse(res, 200, true, retailer_found);
        }).catch(err => {
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching retailers. Code 1.");
        });

    } else {

        // Find all the retailers which are processed
        retailer.findAll({
            attributes:['Website_Title', 'Url_Part'],
            where:{
                Is_Processed: true
            }
        }).then(retailers_found =>{
            helper.sendResponse(res, 200, true, retailers_found);
        }).catch(err => {
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching retailers. Code 1.");
        });
    }
}

//Utility function to get database name from specified retailer url
exports.getRetailerDBFromURL = function(url_part){
    return new Promise((resolve, reject) => {
        retailer.findOne({
            attributes:['Database_Name'],
            where:{
                Url_Part: url_part
            }
        }).then(retailer_found => {
            if(retailer_found){
                resolve(retailer_found.Database_Name);
            }else{
                reject(null);
            }
        }).catch(error => {
            reject(error);
        });
    })
}