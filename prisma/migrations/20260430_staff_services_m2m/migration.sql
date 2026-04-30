-- CreateTable: many-to-many join table for Staff <-> Service
CREATE TABLE IF NOT EXISTS "_ServiceToStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ServiceToStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ServiceToStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_ServiceToStaff_AB_unique" ON "_ServiceToStaff"("A", "B");
CREATE INDEX IF NOT EXISTS "_ServiceToStaff_B_index" ON "_ServiceToStaff"("B");
