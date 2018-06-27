CREATE TABLE IF NOT EXISTS `UserType` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `Type` VARCHAR(45) NOT NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '')
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `User` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `Email` VARCHAR(100) NOT NULL COMMENT '',
  `UserType_id` INT NOT NULL COMMENT '',
  `Password` VARCHAR(100) NOT NULL COMMENT '',
  `First_Name` VARCHAR(50) NULL COMMENT '',
  `Last_Name` VARCHAR(50) NULL COMMENT '',
  `Mobile_Number` VARCHAR(20) NULL COMMENT '',
  `FCM_token` VARCHAR(200) NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '',
  UNIQUE INDEX `email_UNIQUE` (`Email` ASC)  COMMENT '',
  INDEX `fk_User_UserType1_idx` (`UserType_id` ASC)  COMMENT '',
  CONSTRAINT `fk_User_UserType1`
    FOREIGN KEY (`UserType_id`)
    REFERENCES `UserType` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Product` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `Name` VARCHAR(45) NULL COMMENT '',
  `Short_Description` VARCHAR(250) NULL COMMENT '',
  `Detail_Description` BLOB NULL COMMENT '',
  `Price` DOUBLE NOT NULL COMMENT '',
  `Image_Url` VARCHAR(500) NULL COMMENT '',
  `Quantity` INT NOT NULL DEFAULT 0 COMMENT '',
  `Minimum_Quantity_Threshold` INT NOT NULL DEFAULT 0 COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '')
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Cart` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `User_id` INT NOT NULL COMMENT '',
  `Product_id` INT NOT NULL COMMENT '',
  `Quantity` INT NOT NULL COMMENT '',
  PRIMARY KEY (`id`, `User_id`)  COMMENT '',
  INDEX `fk_Cart_User1_idx` (`User_id` ASC)  COMMENT '',
  INDEX `fk_Cart_Product1_idx` (`Product_id` ASC)  COMMENT '',
  CONSTRAINT `fk_Cart_User1`
    FOREIGN KEY (`User_id`)
    REFERENCES `User` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Cart_Product1`
    FOREIGN KEY (`Product_id`)
    REFERENCES `Product` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Alert` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `User_id` INT NOT NULL COMMENT '',
  `Product_id` INT NOT NULL COMMENT '',
  `Is_Triggered` BIT(1) NOT NULL DEFAULT 0 COMMENT '',
  `Created_At` DATETIME NULL COMMENT '',
  `Triggered_At` TIMESTAMP NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '',
  INDEX `fk_Alert_User1_idx` (`User_id` ASC)  COMMENT '',
  INDEX `fk_Alert_Product1_idx` (`Product_id` ASC)  COMMENT '',
  CONSTRAINT `fk_Alert_User1`
    FOREIGN KEY (`User_id`)
    REFERENCES `User` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Alert_Product1`
    FOREIGN KEY (`Product_id`)
    REFERENCES `Product` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Conversation` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `Customer_Service_User_id` INT NOT NULL COMMENT '',
  `Customer_User_id` INT NULL COMMENT '',
  `Is_Finished` BIT(1) NOT NULL COMMENT '',
  `Created_At` TIMESTAMP NOT NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '',
  INDEX `fk_Conversation_User1_idx` (`Customer_Service_User_id` ASC)  COMMENT '',
  INDEX `fk_Conversation_User2_idx` (`Customer_User_id` ASC)  COMMENT '',
  CONSTRAINT `fk_Conversation_User1`
    FOREIGN KEY (`Customer_Service_User_id`)
    REFERENCES `User` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Conversation_User2`
    FOREIGN KEY (`Customer_User_id`)
    REFERENCES `User` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Message` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `Conversation_id` INT NOT NULL COMMENT '',
  `Text` VARCHAR(250) NOT NULL COMMENT '',
  `Is_From_Customer` BIT(1) NOT NULL COMMENT '',
  `Created_At` TIMESTAMP NOT NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '',
  INDEX `fk_Message_Conversation1_idx` (`Conversation_id` ASC)  COMMENT '',
  CONSTRAINT `fk_Message_Conversation1`
    FOREIGN KEY (`Conversation_id`)
    REFERENCES `Conversation` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `StatusType` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `Type` VARCHAR(45) NOT NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '')
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Address` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `User_id` INT NOT NULL COMMENT '',
  `Address_Line_1` VARCHAR(75) NOT NULL COMMENT '',
  `Address_Line_2` VARCHAR(75) NULL COMMENT '',
  `City` VARCHAR(45) NULL COMMENT '',
  `State` VARCHAR(45) NULL COMMENT '',
  `Pincode` VARCHAR(15) NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '',
  INDEX `fk_Address_User1_idx` (`User_id` ASC)  COMMENT '',
  CONSTRAINT `fk_Address_User1`
    FOREIGN KEY (`User_id`)
    REFERENCES `User` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Order` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `User_id` INT NOT NULL COMMENT '',
  `Shipping_Address_id` INT NOT NULL COMMENT '',
  `Billing_Address_id` INT NOT NULL COMMENT '',
  `StatusType_id` INT NOT NULL COMMENT '',
  `Tracking_id` VARCHAR(45) NULL COMMENT '',
  `Created_At` DATETIME NULL COMMENT '',
  `Updated_At` TIMESTAMP NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '',
  INDEX `fk_Order_User1_idx` (`User_id` ASC)  COMMENT '',
  INDEX `fk_Order_StatusType1_idx` (`StatusType_id` ASC)  COMMENT '',
  INDEX `fk_Order_Address1_idx` (`Shipping_Address_id` ASC)  COMMENT '',
  INDEX `fk_Order_Address2_idx` (`Billing_Address_id` ASC)  COMMENT '',
  CONSTRAINT `fk_Order_User1`
    FOREIGN KEY (`User_id`)
    REFERENCES `User` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Order_StatusType1`
    FOREIGN KEY (`StatusType_id`)
    REFERENCES `StatusType` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Order_Address1`
    FOREIGN KEY (`Shipping_Address_id`)
    REFERENCES `Address` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Order_Address2`
    FOREIGN KEY (`Billing_Address_id`)
    REFERENCES `Address` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `UserNotificationSetting` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `User_id` INT NOT NULL COMMENT '',
  `Desktop` BIT(1) NOT NULL DEFAULT true COMMENT '',
  `SMS` BIT(1) NOT NULL DEFAULT true COMMENT '',
  `Email` BIT(1) NOT NULL DEFAULT true COMMENT '',
  PRIMARY KEY (`id`, `User_id`)  COMMENT '',
  INDEX `fk_UserSetting_User1_idx` (`User_id` ASC)  COMMENT '',
  CONSTRAINT `fk_UserSetting_User1`
    FOREIGN KEY (`User_id`)
    REFERENCES `User` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `OrderProduct` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '',
  `Order_id` INT NOT NULL COMMENT '',
  `Product_id` INT NOT NULL COMMENT '',
  `Quantity` INT NOT NULL COMMENT '',
  PRIMARY KEY (`id`)  COMMENT '',
  INDEX `fk_OrderProducts_Order1_idx` (`Order_id` ASC)  COMMENT '',
  INDEX `fk_OrderProducts_Product1_idx` (`Product_id` ASC)  COMMENT '',
  CONSTRAINT `fk_OrderProducts_Order1`
    FOREIGN KEY (`Order_id`)
    REFERENCES `Order` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_OrderProducts_Product1`
    FOREIGN KEY (`Product_id`)
    REFERENCES `Product` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

START TRANSACTION;
INSERT INTO `UserType` (`id`, `Type`) VALUES (1, 'Customer');
INSERT INTO `UserType` (`id`, `Type`) VALUES (2, 'Customer Service');
INSERT INTO `UserType` (`id`, `Type`) VALUES (3, 'Admin');
COMMIT;

START TRANSACTION;
INSERT INTO `StatusType` (`id`, `Type`) VALUES (1, 'Order Placed');
INSERT INTO `StatusType` (`id`, `Type`) VALUES (2, 'Order Processed');
INSERT INTO `StatusType` (`id`, `Type`) VALUES (3, 'Shipped (Fedex)');
INSERT INTO `StatusType` (`id`, `Type`) VALUES (4, 'Delivered');
COMMIT;