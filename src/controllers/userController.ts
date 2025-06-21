import bcrypt from "bcrypt";
import { Request, Response } from "express";
import User, { IUser } from "../models/User";

const modelTitle = "User";



//for only user type
export const getUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = "1", // Default to page 1 if not provided
      limit = "10", // Default to limit 10 if not provided
      sortBy = "name", // Default sorting field
      order = "asc", // Default order
      search = "",
    } = req.query;

    // Parse and validate page and limit
    const parsedPage = Math.max(parseInt(page as string, 10), 1); // Minimum value 1
    const parsedLimit = Math.max(parseInt(limit as string, 10), 1); // Minimum value 1
    const sortOrder = order === "asc" ? 1 : -1; // Convert order to MongoDB format

    const query: any = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } }, // Case-insensitive match for name
            { email: { $regex: search, $options: "i" } }, // Case-insensitive match for email
          ],
        }
      : {};

    query.type = "user";

    // Fetch data with pagination, sorting, and filtering
    const data = await User.find(query)
      .populate("role", "name")
      .select("-password")
      .sort({ [sortBy as string]: sortOrder })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    // Count total documents
    const totalData = await User.countDocuments(query);

    // Send the response
    res.status(200).json({
      data,
      total: totalData,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalData / parsedLimit),
    });
  } catch (error) {
    res.status(500).json({ message: `Error ${modelTitle}.`, error });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await User.findById(id)
      .select("-password")
      .populate("role", "name"); // Exclude password
    if (!data) {
      res.status(404).json({ message: `${modelTitle} not found.` });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: `Error  ${modelTitle}.`, error });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { role, name, email, password, status } = req.body;

    // Check if the user already exists
    const existingData = await User.findOne({ email });
    if (existingData) {
      res.status(400).json({ message: `${modelTitle} already exists.` });
    }

    const newData: IUser = new User({
      role,
      name,
      email,
      password,
      status,
      type: "user",
    });
    await newData.save();

    res
      .status(201)
      .json({ data: newData, message: `${modelTitle} created successfully.` });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${modelTitle}.`, error });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;

    const updatedData: Partial<IUser> = {
      name,
      email,
      role,
      status,
      type: "user",
    };
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedData.password = hashedPassword; // Update password only if provided
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true } // Ensures the updated data adheres to the schema
    ).select("-password"); // Exclude the password field from the result

    if (!updatedUser) {
      res.status(404).json({ message: `${modelTitle} not found.` });
    }

    res.status(200).json({
      data: updatedData,
      message: `${modelTitle} updated successfully.`,
    });
  } catch (error) {
    res.status(500).json({ message: `Error updating ${modelTitle}.`, error });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      res.status(404).json({ message: `${modelTitle} not found.` });
    }

    res.status(200).json({ message: `${modelTitle} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: `Error deleting ${modelTitle}.`, error });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const updatedData: Partial<IUser> = {};
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedData["password"] = hashedPassword; // Update password only if provided
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true } // Ensures the updated data adheres to the schema
    ).select("-password"); // Exclude the password field from the result

    if (!updatedUser) {
      res.status(404).json({ message: `${modelTitle} not found.` });
    }

    res.status(200).json({
      data: updatedData,
      message: `${modelTitle} updated successfully.`,
    });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${modelTitle}.`, error });
  }
};
