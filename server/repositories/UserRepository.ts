import { User, IUser } from '../models/User.js';
import { cleanDni } from '../utils/formatters.js';

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findOne({ id });
  }

  async findByIdentifier(identifier: string): Promise<IUser | null> {
    const raw = identifier.trim();
    const clean = cleanDni(raw);

    return User.findOne({
      $or: [
        { identifier: { $regex: new RegExp(`^${raw}$`, 'i') } },
        { identifier: clean }
      ]
    });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') });
  }

  async findByTenantAndRole(tenantId: string, role?: string): Promise<IUser[]> {
    const query: Record<string, unknown> = { tenantId };
    if (role) query.role = role;
    return User.find(query);
  }

  async count(): Promise<number> {
    return User.countDocuments();
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    const newUser = new User(userData);
    return newUser.save();
  }

  async update(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
    const user = await this.findById(id);
    if (!user) return null;
    Object.assign(user, updateData);
    return user.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
