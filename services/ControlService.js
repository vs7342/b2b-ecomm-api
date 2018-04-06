/**
 * Endpoints/Services related to objects in Control DB (Retailer and ControlUser)
 */

//Node modules
var generator = require('generate-password');
var importer = require('node-mysql-importer');
var Sequelize = require('sequelize');

//Helper functions
var helper = require("../helper");

//Required models
var ControlUser = require("../models/control/ControlUser");
var Retailer = require("../models/control/Retailer");

//Create instances of these models
var ControlSeq = helper.getAgencySeq('control');
var control_user = new ControlUser().dbSeq;
var retailer = new Retailer().dbSeq;

exports.createRetailer = function(req, res){
    
    //Extract request body params
    var Name = req.body.Name;
    var Time_Zone = req.body.Time_Zone;
    var Url_Part = req.body.Url_Part;
    var Website_Title = req.body.Website_Title;
    var Client_Template_id = req.body.Client_Template_id;

    //Check if all params are provided
    if(Name && Time_Zone && Url_Part && Website_Title && Client_Template_id){
        
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
                var config_file_name = '../configs/' + helper.ENVIRONMENT + '.json';
                var mysql_config = require(config_file_name).MySQL;
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
                        
                        //TODO: Create default entries (Eg. First Retailer Admin)

                        //TODO: Set Is_Processed = 1 for created retailer in control db

                        //Return 200
                        helper.sendResponse(res, 200, true, created_retailer);

                    }, 10000)
                }).catch( err => {
                    console.error(err);
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
    var Retailer_id = req.body.Retailer_id;
    var Name = req.body.Name;
    var Time_Zone = req.body.Time_Zone;
    var Url_Part = req.body.Url_Part;
    var Website_Title = req.body.Website_Title;
    var Client_Template_id = req.body.Client_Template_id;
    var Is_Processed = req.body.Is_Processed;

    //Check if all params are provided
    if(Retailer_id && Name && Time_Zone && Url_Part && Website_Title && Client_Template_id && Is_Processed){

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
                id: Retailer_id
            }
        }).then(() => {
            helper.sendResponse(res, 200, true, "Retailer updated successfully.");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating retailer. Code 1.");
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
                helper.sendResponse(res, 200, false, "No retailer found");
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
    var Retailer_id = req.body.Retailer_id;

    if(Retailer_id){
        //Fetch retailer db name so that it can be dropped later
        retailer.findOne({
            where:{
                id: Retailer_id
            }
        }).then(retailer_found=>{

            //Now drop the entry from control database - retailer table
            retailer.destroy({
                where:{
                    id: Retailer_id
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