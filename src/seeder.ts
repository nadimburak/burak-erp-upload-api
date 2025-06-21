import Permission from "./models/Permission";
import Role from "./models/Role";
import User from "./models/User";
import { adminPermissions } from "./utils/adminPermissions";

export const seedDB = async () => {
    try {
        // Clear existing data in parallel where possible
        await Promise.all([
            Permission.deleteMany({}),
            Role.deleteMany({}),
            User.deleteMany({})
        ]);
        console.log("🗑️ Old data removed");

        // Insert new permissions
        const insertedPermissions = await Permission.insertMany(
            adminPermissions.map(p => ({ ...p })),

        );
        console.log(`✅ ${insertedPermissions.length} permissions added`);

        // Create Super Admin Role
        const superAdminRole = new Role({
            name: "Super Admin",
            status: true,
            permissions: insertedPermissions.map(p => p._id),
        });
        await superAdminRole.save();
        console.log("✅ Super Admin role added");

        // Create Super Admin User with hashed password (recommended)
        const adminUser = new User({
            name: "Super Admin",
            email: "admin@gmail.com",
            status: true,
            password: "Abcd@1234", // In production, hash this before saving
            role: superAdminRole._id,
            type: "user"
        });
        await adminUser.save();
        console.log("✅ Super Admin user added");

    } catch (error) {
        throw error;
    }
};