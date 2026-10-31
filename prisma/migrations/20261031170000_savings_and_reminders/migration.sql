-- CreateTable
CREATE TABLE `planning_states` (
    `userId` VARCHAR(64) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `readAlertIds` JSON NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `savings_goals` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `target` DECIMAL(15, 2) NOT NULL,
    `dueDate` DATE NOT NULL,

    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goal_contributions` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `goalId` VARCHAR(64) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `contributionDate` DATE NOT NULL,
    `note` VARCHAR(200) NOT NULL,

    INDEX `goal_contributions_userId_goalId_idx`(`userId`, `goalId`),
    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_reminders` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `dueDate` DATE NOT NULL,
    `remindDays` INTEGER NOT NULL DEFAULT 7,
    `paidDate` DATE NULL,

    INDEX `bill_reminders_userId_dueDate_idx`(`userId`, `dueDate`),
    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `planning_states` ADD CONSTRAINT `planning_states_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `savings_goals` ADD CONSTRAINT `savings_goals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goal_contributions` ADD CONSTRAINT `goal_contributions_userId_goalId_fkey` FOREIGN KEY (`userId`, `goalId`) REFERENCES `savings_goals`(`userId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bill_reminders` ADD CONSTRAINT `bill_reminders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
