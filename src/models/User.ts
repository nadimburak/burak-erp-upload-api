import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import Company from "./Company";
import Role from "./Role";

export type UserType = "user" | "company_user" | "customer";

export interface IUser extends Document {
  company: mongoose.Types.ObjectId;
  role: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  status: boolean;
  type: UserType;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema({
  company: { type: Schema.Types.ObjectId, ref: Company, required: false },
  role: { type: Schema.Types.ObjectId, ref: Role, required: false },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: Boolean, required: false },
  type: {
    type: String,
    enum: ["user", "company_user", "customer"],
    required: true,
  },
});

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
