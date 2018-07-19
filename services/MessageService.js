/**
 * Endpoints/Services related to Message and Conversation object in specified retailer DB
 */

//Helper Function
var helper = require('../helper');

//Required Models
var Conversation = require('../models/Conversation');
var Message = require('../models/Message');
var User = require('../models/User');

exports.startConversation = function(req, res) {
    // This will be called by Customer Service Personnel
    // Customer Service ID will be needed to start the conversation

    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var conversation = new Conversation(Retailer_DB).dbSeq;

    //Extract Body Params
    var Customer_Service_User_id = req.body.Customer_Service_User_id;

    if(Customer_Service_User_id){

        //TODO: Check for any open conversation which CS might have created and left it open

        //Create a conversation with Customer_User_id null since he is not connected yet
        conversation.create({
            Customer_Service_User_id: Customer_Service_User_id,
            Customer_User_id: null,
            Is_Finished: false
        }).then(created_conversation => {
            helper.sendResponse(res, 200, true, created_conversation);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating conversation. Code 1.");
        });
        
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
    
}

exports.getConversation = function(req, res) {
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var conversation = new Conversation(Retailer_DB).dbSeq;

    //Extract query param
    var id = req.query.id;

    if(id){
        //Find the conversation and return it
        conversation.findOne({
            where:{
                id: id
            }
        }).then(conversation_found => {
            if(conversation_found){
                helper.sendResponse(res, 200, true, conversation_found);
            }else{
                helper.sendResponse(res, 200, true, null);
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching conversation details. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.checkAndJoinConversation = function(req, res) {
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var conversation = new Conversation(Retailer_DB).dbSeq;

    //Extract body params
    var Customer_User_id = req.body.Customer_User_id;

    if(Customer_User_id){
        //First find any conversation which is unfinished, and with no customer connected
        conversation.findOne({
            where:{
                Customer_User_id: null,
                Is_Finished: false
            }
        }).then(open_conversation_found => {
            if(open_conversation_found){
                //Since an open conversation is found, update the conversation with the customer id and return conversation id to the user
                conversation.update({
                    Customer_User_id: Customer_User_id
                },{
                    where:{
                        id: open_conversation_found.id
                    }
                }).then(() => {
                    helper.sendResponse(res, 200, true, {
                        Conversation_id: open_conversation_found.id
                    });
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error joining conversation. Code 1.");
                });
            }else{
                helper.sendResponse(res, 200, true, null);
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching conversation. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getMessages = function(req, res) {
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var conversation = new Conversation(Retailer_DB).dbSeq;
    var message = new Message(Retailer_DB).dbSeq;
    var user = new User(Retailer_DB).dbSeq;

    //Extract query params
    var Conversation_id = req.query.Conversation_id;

    //Check if necessary params were sent
    if(Conversation_id){

        // Fetch Conversation and associated messages
        conversation.hasMany(message, {foreignKey: 'Conversation_id'});
        conversation.findOne({
            where:{
                id: Conversation_id
            },
            include:[{
                model: message
            }]
        }).then(conversation_found => {
            if(conversation_found){

                //Fetch user details inside a conversation
                user.findAll({
                    attributes: ['First_Name', 'Last_Name', 'id'],
                    where:{
                        id: [conversation_found.Customer_Service_User_id, conversation_found.Customer_User_id]
                    }
                }).then(users => {
                    helper.sendResponse(res, 200, true, {
                        conversation: conversation_found,
                        users: users
                    });
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error fetching user details in conversation. Code 1.");
                });

            }else{
                helper.sendResponse(res, 200, true, null);
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching messages. Code 1.");
        })

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.postMessage = function(req, res) {
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var message = new Message(Retailer_DB).dbSeq;

    //Extract body params
    var Conversation_id = req.body.Conversation_id;
    var Text = req.body.Text;
    var Is_From_Customer = req.body.Is_From_Customer;

    if(Conversation_id && Text && Is_From_Customer != undefined){

        //TODO: Check if Conversation is valid

        //Post Message
        message.create({
            Conversation_id: Conversation_id,
            Text: Text,
            Is_From_Customer: Is_From_Customer
        }).then(created_message => {
            helper.sendResponse(res, 200, true, created_message);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error sending message. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.endConversation = function(req, res) {
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var conversation = new Conversation(Retailer_DB).dbSeq;

    //Extract body params
    var Conversation_id = req.body.Conversation_id;

    if(Conversation_id){
        //Update the conversation with given conversation id
        conversation.update({
            Is_Finished: true
        },{
            where:{
                id: Conversation_id
            }
        }).then(() => {
            helper.sendResponse(res, 200, true, 'Conversation ended Successfully');
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error ending conversation. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}