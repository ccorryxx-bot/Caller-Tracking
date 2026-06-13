CREATE TABLE `call_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`callType` enum('incoming','outgoing') NOT NULL,
	`callerName` varchar(255),
	`callerPhone` varchar(20) NOT NULL,
	`duration` int NOT NULL,
	`notes` text,
	`outcome` enum('completed','voicemail','callback_scheduled','no_answer','busy','other') NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `call_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `callback_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`callerName` varchar(255) NOT NULL,
	`callerPhone` varchar(20) NOT NULL,
	`scheduledTime` timestamp NOT NULL,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`notes` text,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `callback_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalCalls` int NOT NULL DEFAULT 0,
	`incomingCalls` int NOT NULL DEFAULT 0,
	`outgoingCalls` int NOT NULL DEFAULT 0,
	`totalDuration` int NOT NULL DEFAULT 0,
	`completedCallbacks` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `phone_numbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`agentId` int NOT NULL,
	`campaign` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phone_numbers_id` PRIMARY KEY(`id`),
	CONSTRAINT `phone_numbers_phoneNumber_unique` UNIQUE(`phoneNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('agent','admin') NOT NULL DEFAULT 'agent';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `loginMethod`;