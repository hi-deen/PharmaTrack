import AJV from "ajv";

const ajv = new AJV();

const departmentSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 2, maxLength: 100 },
    description: { type: "string", maxLength: 500 }
  },
  required: ["name"],
  additionalProperties: false
};

export const validateDepartmentCreate = (data) => {
  const validate = ajv.compile(departmentSchema);
  const valid = validate(data);
  return {
    valid,
    errors: valid ? [] : validate.errors
  };
};