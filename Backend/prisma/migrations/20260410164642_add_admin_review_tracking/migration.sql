-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN', 'MESS_MANAGER', 'COMPLAINT_MANAGER', 'CLEANING_MANAGER');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'ALLOCATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessRequestType" AS ENUM ('JOIN', 'CANCEL', 'PAUSE');

-- CreateEnum
CREATE TYPE "MessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MenuMealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "MessPaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateEnum
CREATE TYPE "MessAnnouncementType" AS ENUM ('MENU_CHANGE', 'HOLIDAY', 'DUES', 'EMERGENCY', 'GENERAL');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('ELECTRICAL_FAN_AC', 'ELECTRICAL_LIGHTS', 'PLUMBING_LEAKAGE', 'MESS_FOOD_QUALITY', 'MESS_LATE_MEALS', 'MESS_KITCHEN_HYGIENE', 'FURNITURE_BED_MATTRESS', 'FURNITURE_DAMAGE', 'MAINTENANCE', 'PLUMBING', 'ELECTRICAL', 'MESS_FOOD', 'WATER_SHORTAGE', 'INTERNET_WIFI', 'LAUNDRY_ISSUES', 'SECURITY', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintAssignedRole" AS ENUM ('CLEANER', 'ELECTRICIAN', 'PLUMBER', 'MESS_MANAGER', 'SECURITY');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "erp" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "program" TEXT,
    "isNTHP" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "batch" TEXT,
    "semester" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dietaryPreference" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "block" TEXT,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "type" "RoomType" NOT NULL DEFAULT 'DOUBLE',
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomApplication" (
    "id" SERIAL NOT NULL,
    "appId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "roomId" INTEGER,
    "reviewedBy" INTEGER,
    "term" TEXT NOT NULL,
    "remarks" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "isAdminReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessOrder" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "mealTypes" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessRequest" (
    "id" SERIAL NOT NULL,
    "requestId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "type" "MessRequestType" NOT NULL,
    "pauseStartDate" TIMESTAMP(3),
    "pauseEndDate" TIMESTAMP(3),
    "dietaryPreference" TEXT,
    "note" TEXT,
    "status" "MessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessMembership" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "status" "MessMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "roomNumber" TEXT,
    "dietaryPreference" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessMenuItem" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MenuMealType" NOT NULL,
    "itemName" TEXT NOT NULL,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessBill" (
    "id" SERIAL NOT NULL,
    "billId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "fixedCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perMealCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "MessPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "dueDate" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessAnnouncement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "MessAnnouncementType" NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" SERIAL NOT NULL,
    "complaintId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "subject" TEXT,
    "description" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" TEXT,
    "block" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "attachment" TEXT,
    "assignedRole" "ComplaintAssignedRole",
    "assignedStaff" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintUpdate" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "status" "ComplaintStatus",
    "remarks" TEXT,
    "assignedRole" "ComplaintAssignedRole",
    "assignedStaff" TEXT,
    "updatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_erp_key" ON "User"("erp");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RoomApplication_appId_key" ON "RoomApplication"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "MessOrder_orderId_key" ON "MessOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "MessRequest_requestId_key" ON "MessRequest"("requestId");

-- CreateIndex
CREATE INDEX "MessMembership_studentId_status_idx" ON "MessMembership"("studentId", "status");

-- CreateIndex
CREATE INDEX "MessMenuItem_date_mealType_idx" ON "MessMenuItem"("date", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "MessBill_billId_key" ON "MessBill"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "MessBill_studentId_month_year_key" ON "MessBill"("studentId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintId_key" ON "Complaint"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintUpdate_complaintId_createdAt_idx" ON "ComplaintUpdate"("complaintId", "createdAt");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomApplication" ADD CONSTRAINT "RoomApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomApplication" ADD CONSTRAINT "RoomApplication_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomApplication" ADD CONSTRAINT "RoomApplication_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessOrder" ADD CONSTRAINT "MessOrder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessRequest" ADD CONSTRAINT "MessRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessRequest" ADD CONSTRAINT "MessRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessMembership" ADD CONSTRAINT "MessMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessMenuItem" ADD CONSTRAINT "MessMenuItem_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessBill" ADD CONSTRAINT "MessBill_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessBill" ADD CONSTRAINT "MessBill_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessAnnouncement" ADD CONSTRAINT "MessAnnouncement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintUpdate" ADD CONSTRAINT "ComplaintUpdate_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintUpdate" ADD CONSTRAINT "ComplaintUpdate_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
