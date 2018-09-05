/**
 * Endpoints/Services related to Order / OrderProduct object in specified retailer DB
 */

//Helper Function
var helper = require('../helper');

//Required Models
var User = require('../models/User');
var UserNotificationSetting = require('../models/UserNotificationSetting');
var Address = require('../models/Address');
var Order = require('../models/Order');
var OrderProduct = require('../models/OrderProduct');
var Product = require('../models/Product');
var Cart = require('../models/Cart');
var StatusType = require('../models/StatusType');

exports.createOrder = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var user = new User(Retailer_DB).dbSeq;
    var address = new Address(Retailer_DB).dbSeq;
    var order = new Order(Retailer_DB).dbSeq;
    var order_product = new OrderProduct(Retailer_DB).dbSeq;
    var product = new Product(Retailer_DB).dbSeq;
    var cart = new Cart(Retailer_DB).dbSeq;
    var user_notification_setting = new UserNotificationSetting(Retailer_DB).dbSeq;

    //Extract body params
    var User_id = req.body.User_id;
    var Shipping_Address_id = req.body.Shipping_Address_id;
    var Billing_Address_id = req.body.Billing_Address_id;

    //Check if necessary params were sent
    if(User_id && Shipping_Address_id && Billing_Address_id){

        //Validation 1 - Addresses - Check if the given addresses are valid and from the same user
        address.findAll({
            attributes:['id'],
            where:{
                id: [Shipping_Address_id, Billing_Address_id],
                User_id: User_id
            }
        }).then((addresses_found)=>{

            //If billing and shipping addresses are same, then only one entry will be returned.. Else there will be 2 entries returned
            if(
                (Shipping_Address_id == Billing_Address_id && addresses_found.length == 1) || 
                (Shipping_Address_id != Billing_Address_id && addresses_found.length == 2)
            ){
                //Addresses are valid
                
                //Validation 2 - Product Qty - Fetch cart for the user and check if there are enough quantity for each product
                cart.belongsTo(product, {foreignKey: 'Product_id'});
                cart.findAll({
                    attributes:['Product_id', 'Quantity'],
                    where:{
                        User_id: User_id
                    },
                    include:[{
                        model: product,
                        attributes: ['Name', 'Quantity', 'Minimum_Quantity_Threshold']
                    }]
                }).then(cart_products => {
                    if(cart_products.length > 0){
                        //Loop through all the cart items and check if quantity is available
                        var product_quantities_valid = true;
                        cart_products.forEach(single_cart_product => {
                            //If available quantity is greater or equal than the quantity in cart.. it is valid
                            var product_quantity = single_cart_product.Product.Quantity;
                            var cart_quantity = single_cart_product.Quantity;
                            if(product_quantity >= cart_quantity){
                                product_quantities_valid &= true;
                            }else{
                                product_quantities_valid &= false;
                            }
                        });

                        if(product_quantities_valid){
                            //Product Qty valid for each cart instance

                            //Transaction Step 1 - Create Order instance (If other step fails, delete the order [Manual Rollback])
                            order.create({
                                User_id: User_id,
                                Shipping_Address_id: Shipping_Address_id,
                                Billing_Address_id: Billing_Address_id,
                                StatusType_id: 1,
                                Tracking_id: ""
                            }).then(order_created => {

                                var order_id = order_created.id;
                                var min_qty_threshold_products = [];

                                //Start a DB Transaction
                                var retailer_db_seq = helper.getAgencySeq(Retailer_DB);
                                retailer_db_seq.transaction(order_transaction => {

                                    var arr_promises = [];

                                    //Transaction Step 2 - Reduce Product Quantities 
                                    var order_products = [];
                                    cart_products.forEach(single_cart_product => {
                                        
                                        //Updated quantity would be  = [inventory quantity (value in product table) - cart quantity]
                                        var updated_quantity = single_cart_product.Product.Quantity - single_cart_product.Quantity;
                                        arr_promises.push(
                                            product.update({
                                                Quantity: updated_quantity
                                            },{
                                                where:{
                                                    id: single_cart_product.Product_id
                                                },
                                                transaction: order_transaction
                                            })
                                        );

                                        //Creating order_products array as well for creating OrderProduct instances
                                        order_products.push({
                                            Order_id: order_id,
                                            Product_id: single_cart_product.Product_id,
                                            Quantity: single_cart_product.Quantity
                                        });

                                        //Update the min_qty_threshold_products accordingly
                                        if(updated_quantity <= single_cart_product.Product.Minimum_Quantity_Threshold){
                                            min_qty_threshold_products.push({
                                                id: single_cart_product.Product_id,
                                                Name: single_cart_product.Product.Name
                                            })  
                                        }
                                    });
                                    

                                    //Transaction Step 3 - Create OrderProduct(s)
                                    arr_promises.push(
                                        order_product.bulkCreate(order_products,{
                                            transaction: order_transaction
                                        })
                                    );

                                    //Transaction Step 4 - Empty Cart
                                    arr_promises.push(
                                        cart.destroy({
                                            where:{
                                                User_id: User_id
                                            },
                                            transaction: order_transaction
                                        })
                                    );

                                    //Commit steps 2 and 3
                                    return retailer_db_seq.Promise.all(arr_promises);

                                }).then(transaction_result => {

                                    //Order has been placed successfully - Order creation, OrderProduct(s) creation, Product Quantity reduction
                                    helper.sendResponse(res, 200, true, "Order placed successfully. Thank you for shopping with us.");

                                    //Do rest of the stuff asynchronously- Email to customer and Notify Admins if minimum quantity threshold is reached

                                    //Async Task 1 - Email customer that the order has been placed
                                    user.findOne({
                                        attributes:['Email'],
                                        where:{
                                            id: User_id
                                        }
                                    }).then(user_found => {
                                        
                                        //Construct the email
                                        var products = '';
                                        cart_products.forEach((single_cart_product, index) => {
                                            products += (index + 1) + '. ' + single_cart_product.Product.Name + ' : Qty = ' + single_cart_product.Quantity + '<br/>';
                                        });
                                        var email_body = `
                                        <p>
                                        Congratulations, <br/><br/>
                                        Your order has been successfully placed. <br/><br/>
                                        ` + products + `<br/>
                                        Regards, <br/>
                                        B2BComm Team.
                                        </p>
                                        `;

                                        //Send Email
                                        helper.sendEmail([user_found.Email], 'Order Confirmation', email_body);

                                    }).catch(err=>{
                                        console.error('Error finding user to send order confirmation email.');
                                        console.error(err);
                                    });

                                    //Async Task 2 - Send notifications to Retailer Admins
                                    user.hasOne(user_notification_setting, {foreignKey: 'User_id'});
                                    user.findAll({
                                        attributes:['FCM_token', 'Mobile_Number', 'Email'],
                                        where:{
                                            UserType_id: 3
                                        },
                                        include:[{
                                            model: user_notification_setting,
                                            attributes: ['Desktop', 'SMS', 'Email']
                                        }]
                                    }).then(admins => {

                                        var admin_email_list = [];
                                        var email_product_list = '';
                                        admins.forEach(admin => {

                                            //Loop through all the products whose notifications need to be sent out
                                            min_qty_threshold_products.forEach(product => {

                                                //Desktop Notifications - 1 desktop notification for each product
                                                if(admin.UserNotificationSetting.Desktop && admin.FCM_token.length > 0){
                                                    helper.sendNotification(
                                                        admin.FCM_token,
                                                        'Product quantity below threshold',
                                                        'ID - ' + product.id + ' : Name - ' + product.Name,
                                                        ''
                                                    );
                                                }

                                                //SMS Notification - 1 desktop notification for each product
                                                if(admin.UserNotificationSetting.SMS && admin.Mobile_Number.length > 0){
                                                    helper.sendSMS(
                                                        admin.Mobile_Number,
                                                        'Product quantity below threshold : ID - ' + product.id + ' : Name - ' + product.Name
                                                    );
                                                }

                                                //Prepare for Email Notification - 1 Email for all the products in the list
                                                //Construct the recipient array as well as the email body
                                                if(admin.UserNotificationSetting.Email){
                                                    admin_email_list.push(admin.Email);
                                                    email_product_list += 'ID - ' + product.id + ' : Name - ' + product.Name + '<br/>';   
                                                }
                                            });

                                        });

                                        //Send Email notification
                                        if(admin_email_list.length > 0 && email_product_list != ''){
                                            helper.sendEmail(
                                                admin_email_list,
                                                'Product quantity below threshold',
                                                `
                                                    <p>
                                                        Hello, <br/><br/>
                                                        Following product quantities are below threshold: <br/>` +
                                                        email_product_list + `<br/>
                                                        Regards, <br/>
                                                        B2BComm Team.
                                                    </p>
                                                `
                                            );
                                        }

                                    }).catch(err=>{
                                        console.error('Error finding admins to send notification.');
                                        console.error(err);
                                    });

                                }).catch(err => {

                                    //Since the transaction has failed, we need to do a manual rollback (Delete the created order instance)
                                    order.destroy({
                                        where:{
                                            id: order_id
                                        }
                                    }).then(()=>{
                                        //Database should be clear - no inconsistencies
                                        //We should still respond with error creating order since the transaction failed
                                        helper.sendResponse(res, 500, false, "Error Creating an Order. Code 4.");
                                    }).catch(err=>{
                                        console.error(err);
                                        helper.sendResponse(res, 500, false, "Fatal error creating an order. Kindly contact admin to delete the order instance.");
                                    });

                                });

                            }).catch(err=>{
                                console.error(err);
                                helper.sendResponse(res, 500, false, "Error Creating an Order. Code 3.");
                            });

                        }else{
                            //Product Qty invalid
                            helper.sendResponse(res, 400, false, "Cannot complete the order. Product out of stock / Lesser quantity available in inventory.");
                        }
                    }else{
                        //No products found in cart.. Cannot create order
                        helper.sendResponse(res, 404, false, "Cannot create order. No products found in cart.");
                    }
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error Creating an Order. Code 2.");
                });

            }else{
                //Addresses are invalid
                helper.sendResponse(res, 400, false, "Invalid Address.");
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Creating an Order. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getOrder = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var address = new Address(Retailer_DB).dbSeq;
    var order = new Order(Retailer_DB).dbSeq;
    var order_product = new OrderProduct(Retailer_DB).dbSeq;
    var product = new Product(Retailer_DB).dbSeq;
    var status_type = new StatusType(Retailer_DB).dbSeq;
    var user = new User(Retailer_DB).dbSeq;

    //Extract query params
    var Order_id = req.query.Order_id;
    var User_id = req.query.User_id;
    var StatusType_id = req.query.StatusType_id;

    //Defining associations
    order.hasMany(order_product, {foreignKey: 'Order_id'});
    order_product.belongsTo(product, {foreignKey: 'Product_id'});
    order.belongsTo(status_type, {foreignKey: 'StatusType_id'});
    order.belongsTo(user, {foreignKey: 'User_id'});

    //Check if order id was sent
    if(Order_id){

        //Query DB
        order.findOne({
            where:{
                id: Order_id
            },
            include: [
                {
                    model: order_product,
                    attributes: ['Quantity'],
                    include:[{
                        model: product,
                        attributes: {
                            exclude: ['Detail Description', 'Quantity', 'Minimum_Quantity_Threshold']
                        }
                    }]
                },
                {
                    model: status_type,
                    attributes: ['Type']
                },
                {
                    model: user,
                    attributes: ['First_Name', 'Last_Name', 'Email']
                }
            ]
        }).then(order_found => {
            if(order_found){

                //Fetch Address objects based on Shipping and Billing address IDs
                address.findAll({
                    where:{
                        id: [order_found.Shipping_Address_id, order_found.Billing_Address_id]
                    },
                    attributes:{
                        exclude:['User_id']
                    }
                }).then(addresses => {

                    //Add these addresses respectively in the response data
                    if(order_found.Shipping_Address_id == order_found.Billing_Address_id){
                        order_found.dataValues.Shipping_Address = addresses[0];
                        order_found.dataValues.Billing_Address = addresses[0]; 
                    }else{
                        if(addresses[0].id == order_found.Shipping_Address_id){
                            order_found.dataValues.Shipping_Address = addresses[0];
                            order_found.dataValues.Billing_Address = addresses[1]; 
                        }else{
                            order_found.dataValues.Shipping_Address = addresses[1];
                            order_found.dataValues.Billing_Address = addresses[0]; 
                        }
                    }

                    //Order response is now ready
                    helper.sendResponse(res, 200, true, order_found);

                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error fetching order. Code 2.");
                });

            }else{
                //No order found with given ID
                helper.sendResponse(res, 200, true, null);
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching order. Code 1.");
        });
        
    }else {

        //Find Orders for a user / Find all orders for a particular StatusType_id / Find all orders (All Orders ~ StatusType_id = 0)
        //Create where clause based on query param
        var where_clause = {};
        if(User_id){
            where_clause = {
                User_id: User_id
            }
        }else if(StatusType_id != undefined && StatusType_id != 0){
            where_clause = {
                StatusType_id: StatusType_id
            }
        }

        //Query DB
        order.findAll({
            where: where_clause,
            include: [
                {
                    model: order_product,
                    attributes: ['Quantity'],
                    include:[{
                        model: product,
                        attributes: {
                            exclude: ['Detail Description', 'Quantity', 'Minimum_Quantity_Threshold']
                        }
                    }]
                },
                {
                    model: status_type,
                    attributes: ['Type']
                },
                {
                    model: user,
                    attributes: ['First_Name', 'Last_Name', 'Email']
                }
            ]
        }).then(orders_found => {

            //Loop through the orders found and attach the respective address objects
            orders_found.forEach((single_order, index) => {

                //Fetch Address objects based on Shipping and Billing address IDs for single order
                address.findAll({
                    where:{
                        id: [single_order.Shipping_Address_id, single_order.Billing_Address_id]
                    },
                    attributes:{
                        exclude:['User_id']
                    }
                }).then(addresses => {

                    //Add these addresses respectively in the response data
                    if(single_order.Shipping_Address_id == single_order.Billing_Address_id){
                        single_order.dataValues.Shipping_Address = addresses[0];
                        single_order.dataValues.Billing_Address = addresses[0]; 
                    }else{
                        if(addresses[0].id == single_order.Shipping_Address_id){
                            single_order.dataValues.Shipping_Address = addresses[0];
                            single_order.dataValues.Billing_Address = addresses[1]; 
                        }else{
                            single_order.dataValues.Shipping_Address = addresses[1];
                            single_order.dataValues.Billing_Address = addresses[0]; 
                        }
                    }

                    if(index == (orders_found.length - 1)){

                        //End of list reached.. Send response
                        return helper.sendResponse(res, 200, true, orders_found);

                    }

                }).catch(err=>{
                    console.error(err);
                    return helper.sendResponse(res, 500, false, "Error fetching orders. Code 2.");
                });

            });

            if(orders_found.length == 0){
                //No orders found for the user
                helper.sendResponse(res, 200, true, []);
            }

        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching orders. Code 1.");
        });

    }
};

exports.updateOrder = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var order = new Order(Retailer_DB).dbSeq;
    var user = new User(Retailer_DB).dbSeq;
    var user_notification_setting = new UserNotificationSetting(Retailer_DB).dbSeq;

    //Extract body params
    var id = req.body.id;
    var StatusType_id = req.body.StatusType_id;
    var Tracking_id = req.body.Tracking_id;

    //Check if necessary params were sent
    if(id && StatusType_id){

        if((StatusType_id == 3 || StatusType_id == 4) && (Tracking_id == undefined || Tracking_id.length == 0)){
            //Status ID is 'Shipped' but no tracking ID was provided
            helper.sendResponse(res, 400, false, "Tracking ID is needed when changing the Order Status to Shipped/Delivered.");
        }else{

            //When status ID is 1 or 2, Tracking_id will not be passed
            var tracking_id = (Tracking_id == undefined) ? '' : Tracking_id;

            //Update Order Status
            order.update({
                StatusType_id: StatusType_id,
                Tracking_id: tracking_id
            },{
                where:{
                    id: id
                }
            }).then(()=>{
                helper.sendResponse(res, 200, true, "Order updated successfully.");
                
                // Notify admins if the status of order is updated to 'Issues'
                if(StatusType_id == 5){

                    // Find admins and their notification setting
                    user.hasOne(user_notification_setting, {foreignKey: 'User_id'});
                    user.findAll({
                        attributes:['FCM_token', 'Mobile_Number', 'Email'],
                        where:{
                            UserType_id: 3
                        },
                        include:[{
                            model: user_notification_setting,
                            attributes: ['Desktop', 'SMS', 'Email']
                        }]
                    }).then(admins => {
                        
                        admins.forEach(admin => {

                            //Desktop Notification
                            if(admin.UserNotificationSetting.Desktop && admin.FCM_token.length > 0){
                                helper.sendNotification(
                                    admin.FCM_token,
                                    'Order marked with issues',
                                    'Order ID - ' + id,
                                    ''
                                );
                            }

                            //SMS Notification
                            if(admin.UserNotificationSetting.SMS && admin.Mobile_Number.length > 0){
                                helper.sendSMS(
                                    admin.Mobile_Number,
                                    'Order marked with issues : ID - ' + id
                                );
                            }

                            //Email Notification
                            if(admin.UserNotificationSetting.Email && admin.Email.length > 0){
                                helper.sendEmail(
                                    [admin.Email],
                                    'Order marked with issues',
                                    `
                                        <p>
                                            Hello, <br/><br/>
                                            Order with ID ` + id + ` was marked with issues.<br/><br/>
                                            Regards, <br/>
                                            B2BComm Team.
                                        </p>
                                    `
                                );
                            }  
                        });

                    }).catch(err=>{
                        console.error('Error finding admins to send notification.');
                        console.error(err);
                    });

                }
            }).catch(err=>{
                console.error(err);
                helper.sendResponse(res, 500, false, "Error Updating Order. Code 1.");
            });
        }

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}