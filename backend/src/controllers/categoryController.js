import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/response.js";
import { notFoundError, forbiddenError, badRequest } from "../utils/errors.js";
import { Category, Transaction } from "../models/index.js";

export const listCategories = asyncHandler(async (req, res) => {
  const where = { userId: req.user.id };
  if (req.query.type) where.type = req.query.type;

  const categories = await Category.findAll({
    where,
    order: [
      ["type", "ASC"],
      ["sortOrder", "ASC"],
      ["name", "ASC"],
    ],
    include: [{ model: Category, as: "children" }],
  });
  return ok(res, { categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) throw notFoundError("Khong tim thay danh muc");
  if (cat.userId !== req.user.id) throw forbiddenError();
  return ok(res, { category: cat });
});

export const createCategory = asyncHandler(async (req, res) => {
  // neu co parentId -> validate cung user va cung type
  if (req.body.parentId) {
    const parent = await Category.findByPk(req.body.parentId);
    if (!parent) throw notFoundError("Danh muc cha khong ton tai");
    if (parent.userId !== req.user.id) throw forbiddenError();
    if (parent.type !== req.body.type) {
      throw badRequest("Danh muc cha va con phai cung loai (income/expense)");
    }
  }

  const cat = await Category.create({ ...req.body, userId: req.user.id });
  return created(res, { category: cat }, "Tao danh muc thanh cong");
});

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) throw notFoundError("Khong tim thay danh muc");
  if (cat.userId !== req.user.id) throw forbiddenError();

  // validate parentId moi (neu co)
  if (req.body.parentId !== undefined && req.body.parentId !== null) {
    if (req.body.parentId === cat.id) {
      throw badRequest("Khong the chon chinh no lam danh muc cha");
    }
    const parent = await Category.findByPk(req.body.parentId);
    if (!parent || parent.userId !== req.user.id) {
      throw badRequest("Danh muc cha khong hop le");
    }
    if (parent.type !== cat.type) {
      throw badRequest("Danh muc cha phai cung loai");
    }
  }

  await cat.update(req.body);
  return ok(res, { category: cat }, "Cap nhat danh muc thanh cong");
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByPk(req.params.id);
  if (!cat) throw notFoundError("Khong tim thay danh muc");
  if (cat.userId !== req.user.id) throw forbiddenError();

  if (cat.isSystem) {
    throw badRequest("Khong the xoa danh muc he thong");
  }

  // check co giao dich dung danh muc nay khong
  const txCount = await Transaction.count({ where: { categoryId: cat.id } });
  if (txCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Danh muc nay co ${txCount} giao dich. Hay chuyen sang danh muc khac truoc khi xoa.`,
    });
  }

  // check con danh muc con khong
  const childCount = await Category.count({ where: { parentId: cat.id } });
  if (childCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Danh muc nay co ${childCount} danh muc con. Hay xoa cac danh muc con truoc.`,
    });
  }

  await cat.destroy(); // soft delete
  return ok(res, null, "Da xoa danh muc");
});
