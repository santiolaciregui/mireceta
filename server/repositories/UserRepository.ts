import { User, IUser } from '../models/User.js';

export class UserRepository {
  async findById(id: string) {
    return (User as any).findOne({ id });
  }

  async findByIdentifier(identifier: string) {
    return (User as any).findOne({
      $or: [
        { identifier: { $regex: new RegExp(`^${identifier}$`, 'i') } },
        { identifier: identifier.replace(/\s/g, '').replace(/\./g, '') }
      ]
    });
  }

  async findByEmail(email: string) {
    return (User as any).findOne({ email: new RegExp(`^${email.trim()}$`, 'i') });
  }

  async findByTenantAndRole(tenantId: string, role?: string) {
    const query: any = { tenantId };
    if (role) query.role = role;
    return (User as any).find(query);
  }

  async count() {
    return (User as any).countDocuments();
  }

  async create(userData: Partial<IUser>) {
    const newUser = new User(userData);
    return newUser.save();
  }

  async update(id: string, updateData: Partial<IUser>) {
    const user = await this.findById(id);
    if (!user) return null;
    Object.assign(user, updateData);
    return user.save();
  }

  async delete(id: string) {
    return (User as any).deleteOne({ id });
  }
}
