/**
 * Wrap mot route handler bat dong bo de bat error tu dong
 * va day vao error middleware. Tranh phai viet try/catch o moi controller.
 *
 * Cach dung:
 *   router.get("/", asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
