import { Schema, model } from "mongoose";

const problemSchema = new Schema(
  {
    id: String,
    title: String,
    description: String,
    savingsMs: Number,
    savingsKb: Number,
  },
  { _id: false, id: false },
);

const auditSchema = new Schema(
  {
    url: { type: String, required: true },
    strategy: { type: String, enum: ["mobile", "desktop"], required: true },
    score: { type: Number, required: true },
    lcp: String,
    cls: String,
    pageWeightMb: Number,
    requests: Number,
    problems: [problemSchema],
    // SEO checklist, added after the audit by the /api/inspect route
    seo: { type: Schema.Types.Mixed },
  },
  { timestamps: true }, // adds createdAt and updatedAt automatically
);

export const Audit = model("Audit", auditSchema);
