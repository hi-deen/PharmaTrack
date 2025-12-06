export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next(); // Validation passed → move to the controller
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
  }
};
