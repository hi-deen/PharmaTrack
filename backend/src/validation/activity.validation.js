import AJV from "ajv";

const ajv = new AJV();

const activitySchema = {
  type: "object",
  properties: {
    departmentId: { type: "string", minLength: 24, maxLength: 24 },
    activityType: { type: "string", minLength: 1, maxLength: 100 },
    status: { enum: ["in_progress", "completed", "cancelled"] },
    shift: { enum: ["morning", "afternoon", "evening"] },
    startedAt: { type: "string", format: "date-time" },
    finishedAt: { type: "string", format: "date-time" },
    details: { type: "object" },
    metadata: { type: "object" }
  },
  required: ["departmentId", "activityType"],
  additionalProperties: false
};

export const validateActivityCreate = (data) => {
  const validate = ajv.compile(activitySchema);
  const valid = validate(data);
  return {
    valid,
    errors: valid ? [] : validate.errors
  };
};