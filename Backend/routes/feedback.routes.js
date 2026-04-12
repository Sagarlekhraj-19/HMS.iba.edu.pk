const express = require("express");
const router = express.Router();
const prisma = require("../services/prisma");
const { protect, allowRoles } = require("../middleware/auth.middleware");

// GET /api/feedback/my — student's own feedback history
router.get("/my", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const list = await prisma.feedback.findMany({
      where: { studentId: student.id },
      orderBy: { submittedAt: "desc" },
    });
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/feedback — student submits feedback
router.post("/", protect, allowRoles("STUDENT"), async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const fb = await prisma.feedback.create({
      data: {
        studentId: student.id,
        feedbackType: req.body.feedbackType,
        comment: req.body.comment,
        rating: Number(req.body.rating),
      },
    });

    res.status(201).json(fb);
  } catch (err) { next(err); }
});

module.exports = router;
