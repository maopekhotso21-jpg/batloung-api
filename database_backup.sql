-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: batloung_farm
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `fruits`
--

DROP TABLE IF EXISTS `fruits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fruits` (
  `fruit_id` int NOT NULL AUTO_INCREMENT,
  `fruit_name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fruit_id`),
  UNIQUE KEY `fruit_name` (`fruit_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fruits`
--

LOCK TABLES `fruits` WRITE;
/*!40000 ALTER TABLE `fruits` DISABLE KEYS */;
INSERT INTO `fruits` VALUES (1,'Apples','Fresh red apples, Grade A','ACTIVE','2026-11-14 19:19:22'),(2,'Bananas','Ripe yellow bananas, bunches','ACTIVE','2026-11-14 19:19:22'),(3,'Oranges','Sweet citrus oranges, Valencia','ACTIVE','2026-11-14 19:19:22'),(4,'Mangoes','Ripe mangoes, seasonal','ACTIVE','2026-11-14 19:19:22'),(5,'Grapes','Seedless red grapes','ACTIVE','2026-11-14 19:19:22');
/*!40000 ALTER TABLE `fruits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchasedetails`
--

DROP TABLE IF EXISTS `purchasedetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchasedetails` (
  `purchase_detail_id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `fruit_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `packaging_size` enum('Small','Medium','Large') NOT NULL,
  PRIMARY KEY (`purchase_detail_id`),
  KEY `purchase_id` (`purchase_id`),
  KEY `fruit_id` (`fruit_id`),
  CONSTRAINT `purchasedetails_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`purchase_id`) ON DELETE CASCADE,
  CONSTRAINT `purchasedetails_ibfk_2` FOREIGN KEY (`fruit_id`) REFERENCES `fruits` (`fruit_id`),
  CONSTRAINT `purchasedetails_chk_1` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchasedetails`
--

LOCK TABLES `purchasedetails` WRITE;
/*!40000 ALTER TABLE `purchasedetails` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchasedetails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `purchase_id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `purchase_date` date NOT NULL DEFAULT (curdate()),
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_id`),
  KEY `fk_purchase_supplier` (`supplier_id`),
  CONSTRAINT `fk_purchase_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_purchase_total` CHECK ((`total_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES (1,1,'2026-10-01',2400.00,'2026-11-14 19:19:22'),(2,2,'2026-10-05',1500.00,'2026-11-14 19:19:22');
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `sale_id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `sale_date` date NOT NULL DEFAULT (curdate()),
  `payment_method` enum('CASH','MOBILE_MONEY','CREDIT') NOT NULL DEFAULT 'CASH',
  `payment_status` enum('PAID','PARTIALLY_PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sale_id`),
  KEY `fk_sale_vendor` (`vendor_id`),
  CONSTRAINT `fk_sale_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`vendor_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_sale_paid` CHECK ((`amount_paid` >= 0)),
  CONSTRAINT `chk_sale_paid_le_total` CHECK ((`amount_paid` <= `total_amount`)),
  CONSTRAINT `chk_sale_total` CHECK ((`total_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES (1,1,'2026-10-10','CASH','PAID',300.00,300.00,'2026-11-14 19:19:22'),(2,2,'2026-10-11','MOBILE_MONEY','PARTIALLY_PAID',500.00,200.00,'2026-11-14 19:19:22'),(3,3,'2026-10-12','CREDIT','UNPAID',450.00,0.00,'2026-11-14 19:19:22'),(4,4,'2026-10-13','CASH','PAID',600.00,600.00,'2026-11-14 19:19:22'),(5,1,'2026-11-17','MOBILE_MONEY','PARTIALLY_PAID',1000.00,500.00,'2026-11-17 09:46:14');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salesdetails`
--

DROP TABLE IF EXISTS `salesdetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salesdetails` (
  `sale_detail_id` int NOT NULL AUTO_INCREMENT,
  `sale_id` int NOT NULL,
  `fruit_id` int NOT NULL,
  `packaging_size` enum('Small','Medium','Large') NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`sale_detail_id`),
  KEY `sale_id` (`sale_id`),
  KEY `fruit_id` (`fruit_id`),
  CONSTRAINT `salesdetails_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE CASCADE,
  CONSTRAINT `salesdetails_ibfk_2` FOREIGN KEY (`fruit_id`) REFERENCES `fruits` (`fruit_id`),
  CONSTRAINT `salesdetails_chk_1` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salesdetails`
--

LOCK TABLES `salesdetails` WRITE;
/*!40000 ALTER TABLE `salesdetails` DISABLE KEYS */;
INSERT INTO `salesdetails` VALUES (2,5,1,'Large',5,200.00);
/*!40000 ALTER TABLE `salesdetails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock`
--

DROP TABLE IF EXISTS `stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock` (
  `stock_id` int NOT NULL AUTO_INCREMENT,
  `fruit_id` int NOT NULL,
  `packaging_size` enum('SMALL','MEDIUM','LARGE') NOT NULL,
  `available_quantity` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `uq_stock_fruit_size` (`fruit_id`,`packaging_size`),
  CONSTRAINT `fk_stock_fruit` FOREIGN KEY (`fruit_id`) REFERENCES `fruits` (`fruit_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_stock_qty` CHECK ((`available_quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock`
--

LOCK TABLES `stock` WRITE;
/*!40000 ALTER TABLE `stock` DISABLE KEYS */;
INSERT INTO `stock` VALUES (1,1,'SMALL',40,'2026-11-14 19:19:24'),(2,1,'MEDIUM',30,'2026-11-14 19:19:24'),(3,1,'LARGE',25,'2026-11-14 19:19:24'),(4,2,'SMALL',35,'2026-11-14 19:19:24'),(5,2,'MEDIUM',28,'2026-11-14 19:19:24'),(6,2,'LARGE',20,'2026-11-14 19:19:24'),(7,3,'SMALL',50,'2026-11-14 19:19:24'),(8,3,'MEDIUM',22,'2026-11-14 19:19:24'),(9,3,'LARGE',18,'2026-11-14 19:19:24'),(10,4,'SMALL',15,'2026-11-14 19:19:24'),(11,4,'MEDIUM',12,'2026-11-14 19:19:24'),(12,4,'LARGE',8,'2026-11-14 19:19:24'),(13,5,'SMALL',12,'2026-11-14 19:19:24'),(14,5,'MEDIUM',10,'2026-11-14 19:19:24'),(15,5,'LARGE',6,'2026-11-14 19:19:24');
/*!40000 ALTER TABLE `stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `supplier_id` int NOT NULL AUTO_INCREMENT,
  `business_name` varchar(150) NOT NULL,
  `contact_person` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `province` enum('Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West') NOT NULL,
  `address` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `business_name` (`business_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'Gauteng Fresh Produce','Thabo Mokoena','0115551001','Gauteng','12 Market Road, Johannesburg','2026-11-14 19:19:22'),(2,'Free State Fruit Co','Anna van Wyk','0515551002','Free State','45 Harvest Street, Bloemfontein','2026-11-14 19:19:22'),(3,'KZN Tropical Supplies','Sipho Dlamini','0315551003','KwaZulu-Natal','8 Coastal Drive, Durban','2026-11-14 19:19:22'),(4,'Western Cape Orchards','Pieter Botha','0215551004','Western Cape','22 Vineyard Lane, Cape Town','2026-11-14 19:19:22'),(5,'Fresh SA Farms','John Doe','0821234567','Gauteng','123 Main St, Johannesburg','2026-11-17 08:51:26'),(6,'Cape Fruit Co','Jane Smith','0837654321','Western Cape','45 Long St, Cape Town','2026-11-17 08:51:26'),(7,'KZN Growers','Peter Zuma','0841112222','KwaZulu-Natal','78 Beach Rd, Durban','2026-11-17 08:51:26');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `vendor_id` int NOT NULL AUTO_INCREMENT,
  `vendor_name` varchar(150) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `location` varchar(150) NOT NULL,
  `registration_date` date NOT NULL DEFAULT (curdate()),
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_id`),
  UNIQUE KEY `phone_number` (`phone_number`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES (1,'Maseru Street Vendors Co','63001111','Maseru Central','2026-01-10','2026-11-14 19:19:22'),(2,'Leribe Market Traders','63002222','Leribe Market','2026-02-15','2026-11-14 19:19:22'),(3,'Mafeteng Fruit Stall','63003333','Mafeteng Town','2026-03-05','2026-11-14 19:19:22'),(4,'Berea Small Retailers','63004444','Berea, Maseru','2026-04-20','2026-11-14 19:19:22'),(5,'Maseru Mall Kiosk','63005555','Maseru Mall','2026-05-01','2026-11-14 19:19:22'),(6,'Maseru Street Vendors','58712345','Maseru','2026-01-15','2026-11-17 08:51:26'),(7,'Mafeteng Mini Market','58898765','Mafeteng','2026-02-10','2026-11-17 08:51:26'),(8,'Leribe Corner Shop','58954321','Leribe','2026-03-05','2026-11-17 08:51:26');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17 12:49:06
