import { Request, Response } from "express";
import Role from "../models/Role";
import Permission from "../models/Permission";

const modelTitle = "Role";

export const getRoles = async (req: Request, res: Response) => {
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
        ],
      }
      : {};

    query.company = null;

    // Fetch locations with sorting and pagination
    const data = await Role.find(query)
      .populate("permissions", "name")
      .sort({ [sortBy as string]: sortOrder })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    // Get the total number of documents
    const totalData = await Role.countDocuments();

    // Send the response
    res.status(200).json({
      data,
      total: totalData,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalData / parsedLimit),
    });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${modelTitle}.`, error });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await Role.findById(id).populate("permissions", "name");

    if (!data) {
      res.status(404).json({ message: `${modelTitle} not found.` });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: `Error creating ${modelTitle}.`, error });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, status, permissions } = req.body;

    // Ensure all permissions exist in the database
    const validData = await Permission.find({ _id: { $in: permissions } });
    if (validData.length !== permissions.length) {
      res.status(400).json({ message: "Some permissions are invalid." });
    }

    const newData = new Role({ name, status, permissions });
    await newData.save();
    res
      .status(201)
      .json({ data: newData, message: `${modelTitle} created successfully.` });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${modelTitle}.`, error });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, status, permissions } = req.body;

    // Ensure all permissions exist in the database
    const validData = await Permission.find({ _id: { $in: permissions } });
    if (validData.length !== permissions.length) {
      res.status(400).json({ message: "Some permissions are invalid." });
    }

    const updatedData = await Role.findByIdAndUpdate(
      id,
      { name, status, permissions },
      { new: true } // Return the updated document
    );

    if (!updatedData) {
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

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedData = await Role.findByIdAndDelete(id);
    if (!deletedData) {
      res.status(404).json({ message: `${modelTitle} not found.` });
    }

    res.status(200).json({ message: `${modelTitle} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: `Error creating ${modelTitle}.`, error });
  }
};
