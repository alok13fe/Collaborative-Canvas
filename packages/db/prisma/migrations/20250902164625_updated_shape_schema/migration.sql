/*
  Warnings:

  - You are about to drop the column `type` on the `Shape` table. All the data in the column will be lost.
  - Added the required column `shapeId` to the `Shape` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Shape" DROP COLUMN "type",
ADD COLUMN     "shapeId" TEXT NOT NULL;
