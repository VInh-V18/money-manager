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
  // Express 5 exposes req.query as a getter-only property, so direct assignment
  // throws. Define an own property to keep parsed/default/coerced query values.
  if (source === "query") {
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } else {
    // ghi de bang ban da parse (co default value, da ep kieu)
    req[source] = result.data;
  }
  next();
};
