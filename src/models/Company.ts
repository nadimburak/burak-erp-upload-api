import mongoose, { Document, Model, Schema } from "mongoose";

// Interface for Designation Document
export interface ICompany extends Document {
  company_type: mongoose.Types.ObjectId;
  industries: mongoose.Types.ObjectId;
  country_location: mongoose.Types.ObjectId;
  state_location: mongoose.Types.ObjectId;
  city_location: mongoose.Types.ObjectId;
  name: string;
  prefix: string;
  contact_name: string;
  email: string; // true or false
  mobile: string;
  address: string;
  no_of_employees: number;
  no_of_users: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

// Schema Definition
const CompanySchema: Schema<ICompany> = new Schema(
  {
    company_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyType",
      required: false,
    },
    industries: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Industry",
      required: false,
    }],
    country_location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CountryLocation",
      required: false,
    },
    state_location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StateLocation",
      required: false,
    },
    city_location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CityLocation",
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    prefix: {
      type: String,
      required: false,
    },
    contact_name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      unique: true,
    },
    mobile: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    no_of_employees: {
      type: Number,
      required: false,
    },
    no_of_users: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Mongoose will manage timestamps
  }
);

// Model Definition
const Company: Model<ICompany> = mongoose.model<ICompany>(
  "Company",
  CompanySchema
);

export default Company;
