const mongoose = require('mongoose');

/**
 * Mongoose schema for a Job Listing.
 *
 * Per PRD §5.2: store both `normalized` fields (title, company, location, url, postedAt)
 * and a `raw` blob + `sourceVersion` tag, so a markup change doesn't corrupt
 * historical data and lets you replay/re-normalize later.
 */
const jobListingSchema = new mongoose.Schema(
  {
    // --- Normalized fields ---
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, default: '' },
    url: { type: String, required: true },
    isRemote: { type: Boolean, default: false },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    currency: { type: String, default: null },
    description: { type: String, default: '' },
    skills: { type: [String], default: [] },
    postedAt: { type: String, default: null },
    scrapedAt: { type: String, default: null },
    source: { type: String, default: '' },
    jobHash: { type: String, index: true },

    // --- Raw blob for replay/re-normalization ---
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
    sourceVersion: { type: String, default: 'v1' },
  },
  {
    timestamps: true,
  }
);

// Compound index for deduplication
jobListingSchema.index({ url: 1, source: 1 }, { unique: true });

const JobListing = mongoose.model('JobListing', jobListingSchema);

module.exports = { JobListing, jobListingSchema };
