/**
 * Seed du lieu mau:
 *   - 1 tai khoan demo
 *   - Danh muc mac dinh (10 thu, 10 chi)
 *   - 3 vi tien
 *   - ~30 giao dich mau (15 ngay gan day)
 *   - 1 ngan sach, 1 muc tieu, 1 chi co dinh, 1 mau chi nhanh, 1 khoan no
 *
 * Chay: npm run seed
 */
import {
  sequelize,
  User,
  Wallet,
  Category,
  Transaction,
  Budget,
  FinancialGoal,
  FixedExpense,
  ExpenseTemplate,
  Debt,
} from "../models/index.js";
import { hashPassword } from "../utils/bcrypt.js";
import { addDays, formatDate, today, computeNextDueDate } from "../utils/date.js";
import env from "../config/env.js";

const DEFAULT_INCOME_CATS = [
  { name: "Luong", icon: "briefcase", color: "#10B981" },
  { name: "Thuong", icon: "gift", color: "#10B981" },
  { name: "Lam them", icon: "clock", color: "#10B981" },
  { name: "Freelance", icon: "laptop", color: "#10B981" },
  { name: "Ban hang", icon: "shopping-bag", color: "#10B981" },
  { name: "Duoc cho", icon: "heart", color: "#10B981" },
  { name: "Hoan tien", icon: "rotate-ccw", color: "#10B981" },
  { name: "Dau tu", icon: "trending-up", color: "#10B981" },
  { name: "Tien lai", icon: "percent", color: "#10B981" },
  { name: "Khac", icon: "more-horizontal", color: "#10B981" },
];

const DEFAULT_EXPENSE_CATS = [
  { name: "An uong", icon: "utensils", color: "#EF4444" },
  { name: "Di lai", icon: "car", color: "#F97316" },
  { name: "Nha o", icon: "home", color: "#A855F7" },
  { name: "Hoc tap", icon: "book", color: "#3B82F6" },
  { name: "Giai tri", icon: "music", color: "#EC4899" },
  { name: "Mua sam", icon: "shopping-cart", color: "#F59E0B" },
  { name: "Suc khoe", icon: "heart-pulse", color: "#14B8A6" },
  { name: "Gia dinh", icon: "users", color: "#8B5CF6" },
  { name: "Tra no", icon: "credit-card", color: "#DC2626" },
  { name: "Khac", icon: "more-horizontal", color: "#6B7280" },
];

async function run() {
  console.log("→ Bat dau seed...");

  // dong bo bang truoc
  await sequelize.sync();

  // 1. tao user demo
  const [user, createdUser] = await User.findOrCreate({
    where: { email: env.DEMO_EMAIL },
    defaults: {
      username: "demo",
      email: env.DEMO_EMAIL,
      hashedPassword: await hashPassword(env.DEMO_PASSWORD),
      displayName: "Tai khoan Demo",
      isVerified: true,
    },
  });
  console.log(createdUser ? "  ✓ Tao user demo" : "  • User demo da ton tai");

  // neu user da ton tai va da seed roi -> bo qua de tranh nhan ban du lieu
  const existingTxCount = await Transaction.count({ where: { userId: user.id } });
  if (existingTxCount > 0) {
    console.log("  • Phat hien da seed truoc do, bo qua phan giao dich/nganh sach");
    console.log("\n✓ Hoan tat. Tai khoan demo:");
    console.log(`  Email: ${env.DEMO_EMAIL}`);
    console.log(`  Password: ${env.DEMO_PASSWORD}`);
    process.exit(0);
  }

  // 2. seed danh muc mac dinh
  const incomeCats = await Promise.all(
    DEFAULT_INCOME_CATS.map((c, i) =>
      Category.create({
        userId: user.id,
        name: c.name,
        type: "income",
        icon: c.icon,
        color: c.color,
        isSystem: true,
        sortOrder: i,
      })
    )
  );
  const expenseCats = await Promise.all(
    DEFAULT_EXPENSE_CATS.map((c, i) =>
      Category.create({
        userId: user.id,
        name: c.name,
        type: "expense",
        icon: c.icon,
        color: c.color,
        isSystem: true,
        sortOrder: i,
      })
    )
  );
  console.log(`  ✓ Tao ${incomeCats.length + expenseCats.length} danh muc`);

  // 3. seed vi
  const cashWallet = await Wallet.create({
    userId: user.id,
    name: "Tien mat",
    type: "cash",
    balance: 1500000,
    initialBalance: 1500000,
    color: "#10B981",
    icon: "banknote",
  });
  const bankWallet = await Wallet.create({
    userId: user.id,
    name: "Vietcombank",
    type: "bank",
    balance: 8500000,
    initialBalance: 8500000,
    color: "#1E40AF",
    icon: "credit-card",
  });
  const ewalletWallet = await Wallet.create({
    userId: user.id,
    name: "MoMo",
    type: "ewallet",
    balance: 750000,
    initialBalance: 750000,
    color: "#EC4899",
    icon: "smartphone",
  });
  console.log("  ✓ Tao 3 vi");

  // 4. seed 30 giao dich trong 15 ngay gan day
  const wallets = [cashWallet, bankWallet, ewalletWallet];
  const txs = [];
  const expenseSamples = [
    { desc: "An sang pho", amount: 35000, catName: "An uong" },
    { desc: "Ca phe Highlands", amount: 45000, catName: "An uong" },
    { desc: "An trua com tam", amount: 50000, catName: "An uong" },
    { desc: "Tra sua Phuc Long", amount: 55000, catName: "An uong" },
    { desc: "An toi", amount: 80000, catName: "An uong" },
    { desc: "Do xang", amount: 100000, catName: "Di lai" },
    { desc: "Grab di hoc", amount: 25000, catName: "Di lai" },
    { desc: "Gui xe", amount: 5000, catName: "Di lai" },
    { desc: "Mua sach lap trinh", amount: 250000, catName: "Hoc tap" },
    { desc: "Khoa hoc online Udemy", amount: 199000, catName: "Hoc tap" },
    { desc: "Xem phim CGV", amount: 120000, catName: "Giai tri" },
    { desc: "Spotify Premium", amount: 59000, catName: "Giai tri" },
    { desc: "Mua tai nghe", amount: 350000, catName: "Mua sam" },
    { desc: "Quan ao", amount: 450000, catName: "Mua sam" },
    { desc: "Thuoc cam cum", amount: 80000, catName: "Suc khoe" },
    { desc: "Tien dien thang nay", amount: 280000, catName: "Nha o" },
    { desc: "Internet wifi", amount: 200000, catName: "Nha o" },
  ];
  const incomeSamples = [
    { desc: "Luong thang", amount: 8000000, catName: "Luong" },
    { desc: "Lam them cuoi tuan", amount: 500000, catName: "Lam them" },
    { desc: "Ban quan ao cu", amount: 200000, catName: "Ban hang" },
    { desc: "Hoan thanh project freelance", amount: 1500000, catName: "Freelance" },
    { desc: "Tien thuong sinh nhat", amount: 500000, catName: "Duoc cho" },
  ];

  // 25 giao dich chi
  for (let i = 0; i < 25; i++) {
    const sample = expenseSamples[i % expenseSamples.length];
    const wallet = wallets[i % wallets.length];
    const cat = expenseCats.find((c) => c.name === sample.catName);
    const date = formatDate(addDays(today(), -Math.floor(Math.random() * 15)));
    txs.push({
      userId: user.id,
      walletId: wallet.id,
      categoryId: cat?.id,
      type: "expense",
      subType: "regular",
      amount: sample.amount,
      description: sample.desc,
      transactionDate: date,
    });
  }
  // 5 giao dich thu
  for (let i = 0; i < 5; i++) {
    const sample = incomeSamples[i % incomeSamples.length];
    const wallet = wallets[i % wallets.length];
    const cat = incomeCats.find((c) => c.name === sample.catName);
    const date = formatDate(addDays(today(), -Math.floor(Math.random() * 15)));
    txs.push({
      userId: user.id,
      walletId: wallet.id,
      categoryId: cat?.id,
      type: "income",
      subType: "regular",
      amount: sample.amount,
      description: sample.desc,
      transactionDate: date,
    });
  }
  await Transaction.bulkCreate(txs);
  console.log(`  ✓ Tao ${txs.length} giao dich mau`);

  // 5. ngan sach mau
  const foodCat = expenseCats.find((c) => c.name === "An uong");
  await Budget.create({
    userId: user.id,
    categoryId: foodCat.id,
    name: "Ngan sach An uong thang",
    amount: 2000000,
    period: "monthly",
    startDate: formatDate(today()),
    warnThreshold: 80,
  });
  console.log("  ✓ Tao 1 ngan sach mau");

  // 6. muc tieu mau
  await FinancialGoal.create({
    userId: user.id,
    name: "Mua laptop moi",
    targetAmount: 25000000,
    currentAmount: 5000000,
    targetDate: formatDate(addDays(today(), 180)),
    startDate: formatDate(today()),
    icon: "laptop",
    color: "#A855F7",
  });
  console.log("  ✓ Tao 1 muc tieu mau");

  // 7. chi co dinh mau
  const housingCat = expenseCats.find((c) => c.name === "Nha o");
  await FixedExpense.create({
    userId: user.id,
    walletId: bankWallet.id,
    categoryId: housingCat.id,
    name: "Tien tro hang thang",
    amount: 1500000,
    frequency: "monthly",
    dayOfMonth: 5,
    startDate: formatDate(today()),
    nextDueDate: formatDate(computeNextDueDate(today(), "monthly")),
    autoDeduct: true,
    remindDaysBefore: 3,
  });
  console.log("  ✓ Tao 1 chi co dinh mau");

  // 8. mau chi nhanh
  const drinkCat = expenseCats.find((c) => c.name === "An uong");
  await ExpenseTemplate.bulkCreate([
    {
      userId: user.id,
      walletId: cashWallet.id,
      categoryId: drinkCat.id,
      name: "Ca phe sang",
      defaultAmount: 25000,
      icon: "coffee",
      color: "#92400E",
      isPinned: true,
    },
    {
      userId: user.id,
      walletId: cashWallet.id,
      categoryId: drinkCat.id,
      name: "Tra sua",
      defaultAmount: 50000,
      icon: "cup-soda",
      color: "#EC4899",
      isPinned: true,
    },
  ]);
  console.log("  ✓ Tao 2 mau chi nhanh");

  // 9. no mau
  await Debt.create({
    userId: user.id,
    type: "owed_to_me",
    personName: "Nam (ban cung phong)",
    amount: 500000,
    paidAmount: 0,
    borrowedDate: formatDate(addDays(today(), -10)),
    dueDate: formatDate(addDays(today(), 20)),
    note: "Cho muon mua sach",
  });
  console.log("  ✓ Tao 1 khoan no mau");

  console.log("\n✓ Seed hoan tat. Tai khoan demo:");
  console.log(`  Email:    ${env.DEMO_EMAIL}`);
  console.log(`  Password: ${env.DEMO_PASSWORD}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("✗ Seed loi:", err);
  process.exit(1);
});
