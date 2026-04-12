jest.mock("../services/prisma", () => ({
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  student: {
    create: jest.fn(),
  },
  admin: {
    create: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const prisma = require("../services/prisma");
const bcrypt = require("bcryptjs");
const authService = require("../services/auth.service");

describe("auth.service login role checks", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("denies student credentials on admin portal", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 1,
      erp: "123",
      email: "student@test.com",
      role: "STUDENT",
      password: "hashed",
      isActive: true,
    });

    await expect(
      authService.login({ erp: "123", password: "pass", portal: "ADMIN" })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("denies staff credentials on student portal", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 2,
      erp: null,
      email: "admin@test.com",
      role: "ADMIN",
      password: "hashed",
      isActive: true,
    });

    await expect(
      authService.login({ erp: "admin@test.com", password: "pass", portal: "STUDENT" })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows valid student login on student portal", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 3,
      erp: "345",
      email: "student2@test.com",
      role: "STUDENT",
      password: "hashed",
      isActive: true,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await authService.login({ erp: "345", password: "pass", portal: "STUDENT" });

    expect(res.token).toBeTruthy();
    expect(res.user.role).toBe("STUDENT");
    expect(res.user.password).toBeUndefined();
  });

  it("accepts identifier field as login input", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 4,
      erp: "678",
      email: "student3@test.com",
      role: "STUDENT",
      password: "hashed",
      isActive: true,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await authService.login({ identifier: "678", password: "pass", portal: "STUDENT" });

    expect(res.token).toBeTruthy();
    expect(res.user.role).toBe("STUDENT");
  });

  it("forces student role during public registration", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed");
    prisma.user.create.mockResolvedValue({
      id: 10,
      fullName: "Test Student",
      erp: "99999",
      email: "test@student.com",
      role: "STUDENT",
      password: "hashed",
      isActive: true,
    });
    prisma.student.create.mockResolvedValue({ id: 1, userId: 10 });

    const result = await authService.register({
      fullName: "Test Student",
      erp: "99999",
      email: "test@student.com",
      password: "password123",
      program: "BSCS",
      role: "ADMIN",
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "STUDENT" }),
      })
    );
    expect(result.user.role).toBe("STUDENT");
  });
});
