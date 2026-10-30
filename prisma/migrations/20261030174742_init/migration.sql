-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_token_key`(`token`),
    INDEX `sessions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_accounts` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` TEXT NULL,
    `password` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `auth_accounts_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verifications` (
    `id` VARCHAR(64) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `verifications_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limits` (
    `id` VARCHAR(64) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL,
    `lastRequest` BIGINT NOT NULL,

    UNIQUE INDEX `rate_limits_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_states` (
    `userId` VARCHAR(64) NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_accounts` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `type` VARCHAR(16) NOT NULL,
    `openingBalance` DECIMAL(15, 2) NOT NULL,
    `position` INTEGER NOT NULL,

    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `isFood` BOOLEAN NOT NULL,
    `icon` VARCHAR(64) NOT NULL,
    `color` CHAR(7) NOT NULL,
    `parentId` VARCHAR(64) NULL,
    `archivedAt` VARCHAR(40) NULL,
    `sortOrder` INTEGER NOT NULL,

    INDEX `categories_userId_parentId_idx`(`userId`, `parentId`),
    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `transactionDate` DATE NOT NULL,
    `categoryId` VARCHAR(64) NOT NULL,
    `accountId` VARCHAR(64) NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `notes` TEXT NULL,
    `tags` JSON NULL,
    `refundOf` VARCHAR(64) NULL,

    INDEX `transactions_userId_transactionDate_idx`(`userId`, `transactionDate`),
    INDEX `transactions_userId_categoryId_idx`(`userId`, `categoryId`),
    INDEX `transactions_userId_accountId_idx`(`userId`, `accountId`),
    INDEX `transactions_userId_refundOf_idx`(`userId`, `refundOf`),
    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `month` CHAR(7) NOT NULL,
    `categoryId` VARCHAR(64) NULL,
    `scopeKey` VARCHAR(64) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,

    INDEX `budgets_userId_categoryId_idx`(`userId`, `categoryId`),
    UNIQUE INDEX `budgets_userId_month_scopeKey_key`(`userId`, `month`, `scopeKey`),
    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfers` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `sourceAccountId` VARCHAR(64) NOT NULL,
    `destinationAccountId` VARCHAR(64) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `transferDate` DATE NOT NULL,

    INDEX `transfers_userId_transferDate_idx`(`userId`, `transferDate`),
    INDEX `transfers_userId_sourceAccountId_idx`(`userId`, `sourceAccountId`),
    INDEX `transfers_userId_destinationAccountId_idx`(`userId`, `destinationAccountId`),
    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_accounts` ADD CONSTRAINT `auth_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_states` ADD CONSTRAINT `finance_states_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_accounts` ADD CONSTRAINT `finance_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_userId_parentId_fkey` FOREIGN KEY (`userId`, `parentId`) REFERENCES `categories`(`userId`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_categoryId_fkey` FOREIGN KEY (`userId`, `categoryId`) REFERENCES `categories`(`userId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_accountId_fkey` FOREIGN KEY (`userId`, `accountId`) REFERENCES `finance_accounts`(`userId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_refundOf_fkey` FOREIGN KEY (`userId`, `refundOf`) REFERENCES `transactions`(`userId`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_userId_categoryId_fkey` FOREIGN KEY (`userId`, `categoryId`) REFERENCES `categories`(`userId`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_userId_sourceAccountId_fkey` FOREIGN KEY (`userId`, `sourceAccountId`) REFERENCES `finance_accounts`(`userId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_userId_destinationAccountId_fkey` FOREIGN KEY (`userId`, `destinationAccountId`) REFERENCES `finance_accounts`(`userId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
