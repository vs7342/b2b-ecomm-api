/**
 * Endpoints/Services related to Address object in specified retailer DB
 */

//Helper Function
var helper = require('../helper');

//Required Models
var Address = require('../models/Address');
var User = require('../models/User');

exports.createAddress = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var address = new Address(Retailer_DB).dbSeq;
    var user = new User(Retailer_DB).dbSeq;

    //Extract body params
    var User_id = req.body.User_id;
    var Address_Line_1 = req.body.Address_Line_1;
    var Address_Line_2 = req.body.Address_Line_2;
    var City = req.body.City;
    var State = req.body.State;
    var Pincode = req.body.Pincode;

    //Check if necessary params were sent
    if(User_id && Address_Line_1 && City && State && Pincode){

        //Check if the user is valid
        user.findOne({
            where:{
                id: User_id
            }
        }).then((user_found)=>{
            
            if(user_found){

                //Proceed to address creation
                address.create({
                    User_id: User_id,
                    Address_Line_1: Address_Line_1,
                    Address_Line_2: Address_Line_2,
                    City: City,
                    State: State,
                    Pincode: Pincode
                }).then(created_address => {
                    helper.sendResponse(res, 200, true, created_address);
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error creating address. Code 2.");
                });
            
            }else{
                helper.sendResponse(res, 200, false, "User not found.");
            }

        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating address. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.editAddress = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var address = new Address(Retailer_DB).dbSeq;

    //Extract body params
    var id = req.body.id;
    var Address_Line_1 = req.body.Address_Line_1;
    var Address_Line_2 = req.body.Address_Line_2;
    var City = req.body.City;
    var State = req.body.State;
    var Pincode = req.body.Pincode;

    //Check if necessary params were sent
    if(id && Address_Line_1 && City && State && Pincode){
        address.update({
            Address_Line_1: Address_Line_1,
            Address_Line_2: Address_Line_2,
            City: City,
            State: State,
            Pincode: Pincode
        },{
            where:{
                id: id
            }
        }).then(()=>{
            helper.sendResponse(res, 200, true, "Address updated successfully.");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Updating Address. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getAddress = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var address = new Address(Retailer_DB).dbSeq;

    //Extract query params
    var Address_id = req.query.Address_id;
    var User_id = req.query.User_id;

    //Check if necessary params were sent
    if(Address_id != undefined){

        //Get single address
        address.findOne({
            where:{
                id: Address_id
            }
        }).then((address_found)=>{
            helper.sendResponse(res, 200, true, address_found);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching Address. Code 1.");
        });

    }else if(User_id != undefined){

        //Get all addresses
        address.findAll({
            where:{
                User_id: User_id
            }
        }).then(addresses=>{
            helper.sendResponse(res, 200, true, addresses);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching Addresss. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}