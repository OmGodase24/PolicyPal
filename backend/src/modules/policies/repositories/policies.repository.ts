import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { CreatePolicyDto } from '../dto/create-policy.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';

@Injectable()
export class PoliciesRepository {
  constructor(
    @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
  ) {}

  async create(createPolicyDto: CreatePolicyDto, userId: string): Promise<PolicyDocument> {
    // Set default expiry date to 6 months from creation if not provided
    const defaultExpiryDate = new Date();
    defaultExpiryDate.setMonth(defaultExpiryDate.getMonth() + 6);
    
    const createdPolicy = new this.policyModel({
      ...createPolicyDto,
      createdBy: userId,
      expiryDate: createPolicyDto.expiryDate || defaultExpiryDate,
      expiryDateEdited: false, // Always false during creation - only post-creation edits count as "editing"
    });
    return createdPolicy.save();
  }

  // Removed public findAll - users can only see their own policies
  // async findAll(): Promise<PolicyDocument[]> {
  //   return this.policyModel
  //     .find()
  //     .populate('createdBy', 'firstName lastName email')
  //     .sort({ createdAt: -1 })
  //     .exec();
  // }

  async findById(id: string): Promise<PolicyDocument | null> {
    return this.policyModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .exec();
  }

  async findByUserId(userId: string): Promise<PolicyDocument[]> {
    return this.policyModel
      .find({ createdBy: userId })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updatePolicyDto: UpdatePolicyDto): Promise<PolicyDocument | null> {
    return this.policyModel
      .findByIdAndUpdate(id, updatePolicyDto, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .exec();
  }

  async delete(id: string): Promise<PolicyDocument | null> {
    return this.policyModel.findByIdAndDelete(id).exec();
  }

  // Removed public status filter - users can only see their own policies
  // async findByStatus(status: string): Promise<PolicyDocument[]> {
  //   return this.policyModel
  //     .find({ status })
  //     .populate('createdBy', 'firstName lastName email')
  //     .sort({ createdAt: -1 })
  //     .exec();
  // }

  async findByUserIdAndStatus(userId: string, status: string): Promise<PolicyDocument[]> {
    return this.policyModel
      .find({ createdBy: userId, status })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }
}
