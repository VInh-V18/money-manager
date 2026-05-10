/**
 * Middleware factory: nhan zod schema -> validate req.body/query/params
 *
 * Cach dung:
 *   router.post("/", validate(createWalletSchema), controller.create)
 */
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Du lieu khong hop le",
      errors: result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
  // ghi de bang ban da parse (co default value, da ep kieu)
  req[source] = result.data;
  next();
};
