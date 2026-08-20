/*
  Warnings:

  - You are about to alter the column `monthly_fee` on the `athlete_sports` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `installments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `monthly_fee` on the `invoice_children` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `subtotal` on the `invoices` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `sibling_discount_amount` on the `invoices` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `net_total` on the `invoices` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "athlete_sports" ALTER COLUMN "monthly_fee" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "installments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "invoice_children" ALTER COLUMN "monthly_fee" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "sibling_discount_amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "net_total" SET DATA TYPE DECIMAL(10,2);
