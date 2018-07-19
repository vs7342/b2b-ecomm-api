//Node libraries
var express = require('express');
var http = require('http');
var body_parser = require('body-parser');
var socket_io = require('socket.io');

//Including utility methods
var helper = require('./helper');

//Importing Services
var service_control = require("./services/ControlService");
var service_user = require("./services/UserService");
var service_address = require("./services/AddressService");
var service_product = require("./services/ProductService");
var service_cart = require("./services/CartService");
var service_order = require("./services/OrderService");
var service_message = require("./services/MessageService");

//Express sub-app for control services
var control_app = express();

//Middleware stuff - Request body parser - For Control sub-app
control_app.use(body_parser.json());
control_app.use(body_parser.urlencoded({extended: true}));

//Handling pre-flight requests - required for browsers - For Control sub-app
control_app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');

    if(req.method === 'OPTIONS'){
        res.status(204).send();
    }else{
        next();
    }
})

//Control sub-app login
control_app.post('/user/login', service_control.loginControlUser);

//Middleware stuff - CORS and Authorization header - Control sub-app
control_app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE');

    //Extract control-authorization header since it contains the jwt
    var auth_header = req.headers['Control-Authorization'] || req.headers['control-authorization'];

    if(auth_header){
        //Verify the signature/token
        var decoded = helper.decodeToken(auth_header, true);
        if(decoded !== null){
            //Token Valid
            //Extract Retailer_DB from token and attach it to the request body
            //This body param will be used inside the endpoint function to determine which DB should be used.
            req.body.Retailer_DB = decoded.Retailer_DB;
            next();
        }else{
            //Token Invalid
            helper.sendResponse(res, 401, false, "Invalid Control Token.");
        }

    }else{
        helper.sendResponse(res, 400, false, "Please provide a control token.");
    }
})

//Control sub-app endpoints
//Retailer
control_app.post('/retailer', service_control.createRetailer);
control_app.put('/retailer', service_control.editRetailer);
control_app.get('/retailer', service_control.getRetailer);
control_app.get('/retailer/:retailer_id', service_control.getRetailer);
control_app.delete('/retailer', service_control.deleteRetailer);
control_app.get('/url/available', service_control.checkIfUrlAvailable);
//Control User
control_app.post('/user', service_control.createControlUser);
control_app.put('/user', service_control.editControlUser);
control_app.get('/user', service_control.getControlUser);
control_app.get('/user/:user_id', service_control.getControlUser);
control_app.delete('/user', service_control.deleteControlUser);

//Express app
var app = express();

//Mounting the control sub-app
app.use('/control', control_app);

//Middleware stuff - Request body parser
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

//Handling pre-flight requests - required for browsers
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');

    if(req.method === 'OPTIONS'){
        res.status(204).send();
    }else{
        next();
    }
})

//Public Endpoints
app.get(['/public/retailers','/public/retailers/:url_part'], service_control.getRetailerPublic);
app.get(['/public/:url_part/products/', '/public/:url_part/products/:product_id'], (req, res) => {
    var url_part = req.params.url_part
    if(url_part){

        // Fetch Retailer DB from URL
        service_control.getRetailerDBFromURL(url_part).then(Retailer_DB => {
            //Add Retailer DB in the request body and call product service's method
            req.body.Retailer_DB = Retailer_DB;
            return service_product.getProduct(req, res);
        }).catch(error => {
            //If error is null - meaning no retailer was found against the specified url part
            if(error === null){
                helper.sendResponse(res, 400, false, "Retailer not found");
            }else{
                helper.sendResponse(res, 500, false, "Error fetching product(s). Code 0.");
            }
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters - URL PART");
    }
});

//Endpoints for signup / login (signup - only for customers, login - all users inside a retailer db)
app.post('/signup/:url_part', service_user.userSignup);
app.post('/login/:url_part', service_user.login);

//These 2 end points are just used to display error message when url part is not specified
app.post('/signup', service_user.userSignup);
app.post('/login', service_user.login);

//Middleware stuff - CORS and Authorization header
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE');

    //Extract authorization header since it contains the jwt
    var auth_header = req.headers['Authorization'] || req.headers['authorization'];

    if(auth_header){
        //Verify the signature/token
        var decoded = helper.decodeToken(auth_header, false);
        if(decoded !== null){
            //Token Valid
            //Extract Retailer_DB from token and attach it to the request body
            //This body param will be used inside the endpoint function to determine which DB should be used.
            req.body.Retailer_DB = decoded.Retailer_DB;
            next();
        }else{
            //Token Invalid
            helper.sendResponse(res, 401, false, "Invalid Token.");
        }

    }else{
        helper.sendResponse(res, 400, false, "Please provide a token.");
    }
})

// Retailer DB Endpoints

//User Service
app.post('/user', service_user.createUser);
app.put('/user', service_user.editUser);
app.get('/user', service_user.getUser);
app.get('/user/:user_id', service_user.getUser);
app.put('/notification', service_user.editNotificationSetting);
app.get('/notification', service_user.getNotificationSetting);
app.put('/fcm', service_user.editFCMToken);
app.put('/password', service_user.updatePassword);

//Address Service
app.post('/address', service_address.createAddress);
app.put('/address', service_address.editAddress);
app.get('/address', service_address.getAddress);

//Product Service
app.post('/product', service_product.createProduct);
app.put('/product', service_product.editProduct);
app.get('/product', service_product.getProduct);
app.get('/product/:product_id', service_product.getProduct);
app.post('/alert', service_product.createAlert);
app.get('/alert', service_product.getAlert);

//Cart Service
app.post('/cart', service_cart.addProductToCart);
app.put('/cart', service_cart.changeProductQuantity);
app.get('/cart', service_cart.getCartForUser);
app.delete('/cart', service_cart.emptyCart);

//Order Service
app.post('/order', service_order.createOrder);
app.get('/order', service_order.getOrder);
app.put('/order', service_order.updateOrder);

//Message Service
app.post('/conversation', service_message.startConversation);
app.get('/conversation', service_message.getConversation);
app.put('/conversation/join', service_message.checkAndJoinConversation);
app.delete('/conversation', service_message.endConversation);
app.post('/message', service_message.postMessage);
app.get('/message', service_message.getMessages);

//Create server from the main app
var server = http.createServer(app);

//Server will accept request on port 80
server.listen(80, function(){
    console.log('API handling requests on port ' + server.address().port);
});

//Sockets
var io = socket_io(server);

//CORS
io.origins("*:*");

//Messages namespace
var message_io = io.of('/messages');
message_io.on('connection', socket => {
    
    //Connection success
    console.log('SOCKET: Connected!');

    //Room Handlers

    //1. Join Room
    socket.on('join-room', data => {

        //Leave all rooms since client can be present in only one room
        //Possible when someone switched tab and started a new conversation or something
        for(var room in socket.rooms){
            socket.leave(room);
            //Notify the client connected in that room that this client has left
            message_io.to(room).emit('client-left-room', {
                user_id: socket.user_id,
                user_name: socket.user_name
            });
            console.log('SOCKET: ' + socket.user_id + ' left ' + room);
        }

        //Get the url_part of the retailer from data
        var url_part = data.url_part;

        //Now get the conversation ID
        var conversation_id = data.conversation_id;

        //Get User Details
        socket.user_id = data.user_id;
        socket.user_name = data.user_name;

        //TODO: Secure the join-room by validating the requests coming from user with the conversation / users in conversation in DB

        //Room ID will look like - room_abc_1 - room_<url_part>_<conversation_id>
        socket.join('room_' + url_part + '_' + conversation_id);
        console.log('SOCKET: ' + socket.user_id + ' joined ' + 'room_' + url_part + '_' + conversation_id);

        //Emit an event saying that user has joined the chat
        message_io.to('room_' + url_part + '_' + conversation_id).emit('client-join-room', {
            user_id: socket.user_id,
            user_name: socket.user_name
        });
    });

    //2. Send Message in room (Conversation)
    socket.on('send-room-message', data => {

        //Get the url_part of the retailer from data
        var url_part = data.url_part;

        //Now get the conversation ID
        var conversation_id = data.conversation_id;

        //Emit to connected recievers
        socket.broadcast.to('room_' + url_part + '_' + conversation_id).emit('client-rcv-room-msg', data);

        //Log
        console.log('SOCKET: Message sent in room_' + url_part + '_' + conversation_id + ' : ' + JSON.stringify(data));
    });

    //3. End Conversation
    socket.on('end-conversation', data => {
        //Get the url_part of the retailer from data
        var url_part = data.url_part;

        //Now get the conversation ID
        var conversation_id = data.conversation_id;

        //Emit to connected recievers
        socket.broadcast.to('room_' + url_part + '_' + conversation_id).emit('client-end-conversation', data);

        //Log
        console.log('SOCKET: Conversation ended for room_' + url_part + '_' + conversation_id);
    });

    //4. Leaving the room
    socket.on('leave-room', data => {
        //Get the url_part of the retailer from data
        var url_part = data.url_part;

        //Now get the conversation ID
        var conversation_id = data.conversation_id;

        //Leave the room
        socket.leave('room_' + url_part + '_' + conversation_id);

        //Log
        console.log('SOCKET: Client left room_' + url_part + '_' + conversation_id);
    });

    //5. Disconnecting handler (Called just before actual disconnection) - data is lost in disconnect.. thus using disconnecting
    socket.on('disconnecting', function(){
        //Get all rooms the client was in..
        var all_rooms_of_user = socket.rooms;
        //Check since there might not be any rooms for a client
        if(all_rooms_of_user){
            for(var single_room in all_rooms_of_user){
                //Let all rooms know that the user has left..
                message_io.to(single_room).emit('client-left-room', {
                    user_id: socket.user_id,
                    user_name: socket.user_name
                });
                console.log('SOCKET: ' + socket.user_id + ' left ' + single_room);
            }
        }
    });

    //4. Disconnect handler
    socket.on('disconnect', function(){
        console.log('SOCKET: Disconnected!');
    });

});

app.get('/socket/clients', function(req, res){
    //Construct room id using the query params
    var conversation_id = req.query.conversation_id;
    var url_part = req.query.url_part;
    var room_id = 'room_' + url_part + '_' + conversation_id;
    
    //Check if the room exists
    if(!message_io.adapter.rooms[room_id]){
        //room does not exists
        //return an empty array
        return helper.sendResponse(res, 200, true, []);
    }

    //Fetch clients connected to socket
    try{
        var online_users_in_room = [];
        var clients = message_io.adapter.rooms[room_id].sockets;
        for (var clientId in clients) {
            var client_socket = message_io.sockets[clientId];
            online_users_in_room.push({
                user_id: client_socket.user_id,
                user_name: client_socket.user_name
            });
        }
        return helper.sendResponse(res, 200, true, online_users_in_room);
    } catch(e){
        console.log(e);
        return res.status(200).send(helper.getResponseObject(false, 'Error retrieving connected clients.'));
    }
});