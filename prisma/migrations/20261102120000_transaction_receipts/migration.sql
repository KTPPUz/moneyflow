-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `receiptId` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `receipts` (
    `userId` VARCHAR(64) NOT NULL,
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `mimeType` VARCHAR(32) NOT NULL,
    `size` INTEGER NOT NULL,
    `content` MEDIUMBLOB NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `receipts_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`userId`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `transactions_userId_receiptId_idx` ON `transactions`(`userId`, `receiptId`);

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_receiptId_fkey` FOREIGN KEY (`userId`, `receiptId`) REFERENCES `receipts`(`userId`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

