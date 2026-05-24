import { DJOperator, IDJOperator } from '../../models/dj-operator.schema';

export const createDJOperator = async (data: Partial<IDJOperator>): Promise<IDJOperator> => {
  const dj = new DJOperator(data);
  return await dj.save();
};

export const getDJOperators = async (page: number = 1, limit: number = 10): Promise<{ djs: IDJOperator[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await DJOperator.countDocuments();
  const djs = await DJOperator.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
  return {
    djs,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getDJOperatorById = async (id: string): Promise<IDJOperator | null> => {
  return await DJOperator.findById(id);
};

export const updateDJOperator = async (id: string, data: Partial<IDJOperator>): Promise<IDJOperator | null> => {
  return await DJOperator.findByIdAndUpdate(id, data, { new: true });
};

export const deleteDJOperator = async (id: string): Promise<IDJOperator | null> => {
  return await DJOperator.findByIdAndDelete(id);
};
